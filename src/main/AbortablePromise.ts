/**
 * The promise that can be instantly aborted.
 *
 * @template T The value that the promise is resolved with.
 */
export class AbortablePromise<T> extends Promise<T> {
  /**
   * Creates a new abortable promise.
   *
   * @param executor A callback used to initialize the promise.
   * @template T The value that the deferred is resolved with.
   */
  constructor(
    executor: (
      /**
       * The resolve callback used to resolve the promise with a value or the result of another promise.
       *
       * @param result The fulfillment result.
       */
      resolve: (result: T | PromiseLike<T>) => void,
      /**
       * The reject callback used to reject the promise with a provided reason or error.
       *
       * @param reason The rejection reason.
       */
      reject: (reason?: any) => void,
      /**
       * The signal that is aborted if {@link abort} method is called.
       */
      signal: AbortSignal
    ) => void
  ) {
    const abortController = new AbortController();
    const signal = abortController.signal;

    super((resolve, reject) => {
      signal.addEventListener('abort', () => {
        reject(signal.reason);
      });

      executor(resolve, reject, signal);
    });

    this.abort = abortController.abort.bind(abortController);
  }

  /**
   * Aborts the signal passed to the promise executor and instantly rejects the promise with the reason.
   *
   * @param reason The abort reason. If not explicitly provided, it defaults to an
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/DOMException#aborterror AbortError}.
   */
  declare abort: (reason?: any) => void;
}