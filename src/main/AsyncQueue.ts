import { AbortablePromise } from './AbortablePromise.js';

/**
 * The protocol provided to the {@link AsyncQueue} consumer, so it can acknowledge that the value was processed and
 * should be removed from the queue.
 *
 * @template T The value taken from the queue.
 */
export type ValueAck<T> = [value: T, ack: (isTaken: boolean) => void];

/**
 * Asynchronous queue decouples value producers and value consumers.
 *
 * @template T The value stored in the queue.
 */
export class AsyncQueue<T = any> {
  /**
   * The elements stored in the queue.
   */
  private _elements: T[] = [];

  /**
   * The promise that resolves after the most recent take was acknowledged.
   */
  private _promise = Promise.resolve();

  /**
   * Resolves a pending acknowledgement promise, so the consumer can obtain the value from the queue. `undefined` if
   * there's no pending consumer.
   */
  private _resolveTake?: () => void;

  /**
   * Returns the number of values stored in this queue.
   */
  get size() {
    return this._elements.length;
  }

  /**
   * Appends a new value to the end of the queue.
   *
   * @param value The value to append.
   */
  append(value: T): this {
    this._elements.push(value);

    if (this._resolveTake !== undefined) {
      this._resolveTake();
    }
    return this;
  }

  /**
   * Returns a promise that is fulfilled with a value when it is available.
   *
   * Values are taken in the same order they were appended. Taken values are removed from the queue.
   *
   * @returns The promise that is fulfilled with a value that was added to the queue. Aborting the returned  promise
   * after the value was taken is a no-op.
   */
  take(): AbortablePromise<T> {
    return new AbortablePromise((resolve, reject, signal) => {
      this.takeAck()
        .withSignal(signal)
        .then(([value, ack]) => {
          ack(!signal.aborted);
          resolve(value);
        }, reject);
    });
  }

  /**
   * Returns a promise that is fulfilled with a value and an acknowledgement callback.
   *
   * The promise is fulfilled when a value is available. Consequent consumers are blocked until the acknowledgement
   * callback is invoked. Invoking acknowledgement callback multiple times is a no-op.
   *
   * **Note:** Be sure to always call an acknowledgement callback. Otherwise, consequent consumers would never be
   * fulfilled.
   *
   * @returns A tuple that contains a value available in the queue, and a callback that acknowledges that the value was
   * processed and should be removed from the queue. Aborting the returned promise after a consumer received an
   * acknowledgement callback is a no-op.
   */
  takeAck(): AbortablePromise<ValueAck<T>> {
    return new AbortablePromise((resolveTake, _rejectTake, signal) => {
      this._promise = this._promise.then(() => {
        if (signal.aborted) {
          return;
        }

        return new Promise(resolveAck => {
          let isAcked = false;

          const ack = (isTaken: boolean) => {
            if (isAcked) {
              return;
            }
            if (isTaken) {
              this._elements.shift();
            }
            resolveAck();
            isAcked = true;
          };

          if (this._elements.length !== 0) {
            resolveTake([this._elements[0], ack]);
            return;
          }

          const abortTake = () => {
            this._resolveTake = undefined;
            resolveAck();
          };

          signal.addEventListener('abort', abortTake);

          this._resolveTake = () => {
            signal.removeEventListener('abort', abortTake);

            this._resolveTake = undefined;
            resolveTake([this._elements[0], ack]);
          };
        });
      });
    });
  }

  /**
   * Iterates over elements that are available in the queue.
   */
  [Symbol.iterator](): IterableIterator<T> {
    return this._elements[Symbol.iterator]();
  }
}
