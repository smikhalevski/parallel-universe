import { noop } from './utils';

/**
 * The protocol provided to the {@linkcode AsyncQueue} consumer, so it can acknowledge that the value would be processed.
 *
 * @template T The taken value.
 */
export type AckProtocol<T> = [value: T, ack: (ok?: boolean) => void];

/**
 * Asynchronous queue decouples value providers and value consumers.
 *
 * @template T The value stored in the queue.
 */
export class AsyncQueue<T = any> {
  /**
   * The list of values in the queue.
   */
  private _values: T[] = [];

  /**
   * The promise that was returned for the most recent take.
   */
  private _promise = Promise.resolve();

  /**
   * Resolves a pending acknowledgement promise, so the consumer can obtain the value from the queue. `undefined` if
   * there's no pending consumer.
   */
  private _notify?: () => void;

  /**
   * Returns the number of values stored in this queue.
   */
  get size() {
    return this._values.length;
  }

  /**
   * Returns a promise that is fulfilled with a value when it is available. Values are taken in the same order they were
   * added. Taken values are removed from the queue.
   *
   * @returns The promise that is fulfilled with a value that was added to the queue.
   */
  take(): Promise<T> {
    return this._takeAck(false).then(okAckValue);
  }

  /**
   * Returns a promise that is fulfilled with an {@linkcode AckProtocol} when a value is available.
   *
   * The acknowledgement is automatically revoked on _the next tick_ after returned promise is fulfilled. Value
   * remains in the queue is the acknowledgement wasn't called.
   */
  takeAck(): Promise<AckProtocol<T>> {
    return this._takeAck(false);
  }

  /**
   * Returns a promise that is fulfilled with an {@linkcode AckProtocol} when a value is available.
   *
   * Consequent consumers are blocked until the acknowledgement is called.
   */
  takeBlockingAck(): Promise<AckProtocol<T>> {
    return this._takeAck(true);
  }

  /**
   * Appends the new value to the end of the queue.
   *
   * @param value The value to append.
   */
  add(value: T): this {
    this._values.push(value);
    this._notify?.();
    return this;
  }

  /**
   * Iterates over elements that are available in the queue.
   */
  [Symbol.iterator](): IterableIterator<T> {
    return this._values[Symbol.iterator]();
  }

  private _takeAck(blocking: boolean): Promise<AckProtocol<T>> {
    const { _values } = this;

    let ackSettled = false;
    let ackRevoked = false;
    let resolveAck: (() => void) | undefined;

    const ack = (ok = true): void => {
      if (ackSettled) {
        return;
      }
      if (ackRevoked) {
        throw new Error('AsyncQueue acknowledgement was revoked');
      }
      if (ok) {
        _values.shift();
      }
      ackSettled = true;
      resolveAck?.();
    };

    const promise = this._promise.then<AckProtocol<T>>(() => {
      if (_values.length !== 0) {
        return [_values[0], ack];
      }

      return new Promise(resolve => {
        this._notify = () => {
          this._notify = undefined;
          resolve([_values[0], ack]);
        };
      });
    });

    if (blocking) {
      const ackPromise = new Promise<void>(resolve => {
        resolveAck = resolve;
      });

      this._promise = promise.then(() => ackPromise);
    } else {
      this._promise = promise.then(noop).then(() => {
        ackRevoked = true;
      });
    }

    return promise;
  }
}

function okAckValue<T>([value, ack]: AckProtocol<T>): T {
  ack();
  return value;
}
