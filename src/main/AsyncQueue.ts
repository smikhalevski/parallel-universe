import {noop} from './utils';

/**
 * The protocol provided to the {@link AsyncQueue} consumer so it can acknowledge that the value would be processed.
 */
export type AckProtocol<T> = [value: T, ack: (ok?: boolean) => void];

/**
 * Asynchronous queue decouples value providers and value consumers.
 */
export class AsyncQueue<T = any> {

  private readonly _values: T[] = [];
  private _promise = Promise.resolve();
  private _resolve?: () => void;

  /**
   * Returns the number of values stored in this queue.
   */
  public get size() {
    return this._values.length;
  }

  /**
   * Returns a `Promise` that resolves with a value when it is available. Values are taken in the same order they were
   * added. Taken values are removed from the queue.
   *
   * @returns The `Promise` that resolves with a value that was added to the queue.
   */
  public take(): Promise<T> {
    return this.takeAck().then(okAckValue);
  }

  /**
   * Returns a `Promise` that resolves with an {@link AckProtocol} when a value is available.
   *
   * @param [blocking = false] If set to `true` then consequent consumers would be blocked until `ack` is called,
   *     otherwise the acknowledgement is automatically revoked on _the next tick_ after returned `Promise` is resolved
   *     and value remains in the queue.
   * @return The `Promise` that resolved with an acknowledgement protocol.
   */
  public takeAck(blocking?: boolean): Promise<AckProtocol<T>> {
    const {_values} = this;

    let ackResolved = false;
    let ackRevoked = false;
    let ackResolve: (() => void) | undefined;

    const ack = (ok = true): void => {
      if (ackResolved) {
        return;
      }
      if (ackRevoked) {
        throw new Error('Acknowledgement was revoked.');
      }
      if (ok) {
        _values.shift();
      }
      ackResolved = true;
      ackResolve?.();
    };

    const promise = this._promise.then<AckProtocol<T>>(() => {
      if (_values.length) {
        return [_values[0], ack];
      }
      return new Promise((resolve) => {
        this._resolve = () => {
          this._resolve = undefined;
          resolve([_values[0], ack]);
        };
      });
    });

    if (blocking) {
      const ackPromise = new Promise<void>((resolve) => {
        ackResolve = resolve;
      });
      this._promise = promise.then(() => ackPromise);
    } else {
      this._promise = promise.then(noop).then(() => {
        ackRevoked = true;
      });
    }

    return promise;
  }

  /**
   * Appends the new value to the queue.
   *
   * @param value The value to append.
   */
  public add(value: T): this {
    this._values.push(value);
    this._resolve?.();
    return this;
  }

  /**
   * Iterates over elements that are available in the queue.
   */
  public [Symbol.iterator](): IterableIterator<T> {
    return this._values[Symbol.iterator]();
  }
}

function okAckValue<T>([value, ack]: AckProtocol<T>): T {
  ack();
  return value;
}
