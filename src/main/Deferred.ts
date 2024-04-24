import { Awaitable } from './types';

/**
 * The promise that can be resolved externally.
 *
 * @template T The value that the promise is fulfilled with.
 */
export class Deferred<T> extends Promise<T> {
  static get [Symbol.species]() {
    return Promise;
  }

  /**
   * Fulfills the promise with the specified value. If the promise has already been resolved, either to a value,
   * a rejection, or another promise, this method does nothing.
   *
   * @param value If this value is not a promise, including `undefined`, it becomes the fulfillment value of the
   * associated promise. If this value is a promise, then the associated promise will be resolved to the passed promise,
   * and follow the state as the provided promise (including any future transitions).
   */
  resolve: (value: Awaitable<T>) => void;

  /**
   * Rejects the promise with the specified reason. If the promise has already been resolved, either to a value,
   * a rejection, or another promise, this method does nothing.
   *
   * @param reason The rejection reason for the associated promise. Although the reason can be undefined, it is
   * generally an {@link Error} object, like in exception handling.
   *
   * **Note:** This argument should not be a promise. Specifying a rejected promise would make the rejection reason
   * equal to the rejected promise itself, and not its rejection reason.
   */
  reject: (reason?: any) => void;

  /**
   * Creates a new instance of {@link Deferred}.
   *
   * @template T The value that the promise is fulfilled with.
   */
  constructor() {
    let resolve;
    let reject;

    super((resolveSuper, rejectSuper) => {
      resolve = resolveSuper;
      reject = rejectSuper;
    });

    this.resolve = resolve!;
    this.reject = reject!;
  }
}
