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
   * Fulfills the deferred with the result.
   *
   * @param result The fulfillment result.
   */
  declare resolve: (result: T | PromiseLike<T>) => void;

  /**
   * Rejects the deferred with the reason.
   *
   * @param reason The rejection reason.
   */
  declare reject: (reason?: any) => void;

  /**
   * Attaches callbacks for the fulfillment and/or rejection of the deferred.
   *
   * @param onFulfilled The callback to execute when the deferred is fulfilled.
   * @param onRejected The callback to execute when the deferred is rejected.
   * @returns A promise for the completion of whichever callback is executed.
   * @template R1 The value returned from the fulfillment callback.
   * @template R2 The value returned from the rejection callback.
   */
  declare then: <R1 = T, R2 = never>(
    onFulfilled?: ((result: T) => R1 | PromiseLike<R1>) | null,
    onRejected?: ((reason: any) => R2 | PromiseLike<R2>) | null
  ) => Promise<R1 | R2>;
}
