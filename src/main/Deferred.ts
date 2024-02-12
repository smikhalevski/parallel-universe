/**
 * The promise-like object that can be resolved externally.
 *
 * @template T The value that the deferred is fulfilled with.
 */
export class Deferred<T> implements PromiseLike<T> {
  /**
   * Creates a new deferred.
   *
   * @template T The value that the deferred is resolved with.
   */
  constructor() {
    const promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    this.then = promise.then.bind(promise);
  }

  /**
   * Fulfills the associated promise with the specified value. If the associated promise has already been resolved,
   * either to a value, a rejection, or another promise, this method does nothing.
   *
   * @param value If this value is not a promise, including `undefined`, it becomes the fulfillment value of the
   * associated promise. If this value is a promise, then the associated promise will be resolved to the passed promise,
   * and follow the state as the provided promise (including any future transitions).
   */
  declare resolve: (value: T | PromiseLike<T>) => void;

  /**
   * Rejects the associated promise with the specified reason. If the promise has already been resolved, either to a
   * value, a rejection, or another promise, this method does nothing.
   *
   * @param reason The rejection reason for the associated promise. Although the reason can be undefined, it is
   * generally an {@link !Error Error} object, like in exception handling.
   *
   * **Note:** This argument should not be a promise. Specifying a rejected promise would make the rejection reason
   * equal to the rejected promise itself, and not its rejection reason.
   */
  declare reject: (reason?: any) => void;

  /**
   * Appends fulfillment and rejection handlers to the deferred, and returns a new promise resolving to the return value
   * of the called handler, or to its original settled value if the promise was not handled (i.e. if the relevant
   * handler `onFulfilled` or `onRejected` is not a function).
   *
   * @param onFulfilled A function to asynchronously execute when this deferred becomes fulfilled. Its return value
   * becomes the fulfillment value of the promise returned by {@link then}.
   * @param onRejected A function to asynchronously execute when this promise becomes rejected. Its return value becomes
   * the fulfillment value of the promise returned by {@link then}.
   * @returns Returns a new promise immediately. This new promise is always pending when returned, regardless of the
   * status of this deferred.
   * @template A The value returned from the fulfillment callback.
   * @template B The value returned from the rejection callback.
   */
  declare then: <A = T, B = never>(
    onFulfilled?: ((value: T) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: any) => B | PromiseLike<B>) | null
  ) => Promise<A | B>;
}
