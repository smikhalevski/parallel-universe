import type { Awaitable } from './types';

/**
 * The promise that can be aborted.
 *
 * @template T The value that the promise is resolved with.
 */
export class AbortablePromise<T> extends Promise<T> {
  private _abortController: AbortController;

  /**
   * Creates a new abortable promise.
   *
   * @param executor A callback that initializes the promise.
   * @template T The value that the promise is resolved with.
   */
  constructor(
    executor: (
      /**
       * The resolve callback used to resolve the promise with a value or the result of another promise.
       *
       * @param value The fulfillment result.
       */
      resolve: (value: Awaitable<T>) => void,
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

    super((resolve, reject) => {
      abortController.signal.addEventListener('abort', () => {
        reject(abortController.signal.reason);
      });
      executor(resolve, reject, abortController.signal);
    });

    this._abortController = abortController;
  }

  /**
   * Aborts the signal passed to the executor and instantly rejects the promise with the reason.
   *
   * @param reason The abort reason. If not explicitly provided, it defaults to an
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/DOMException#aborterror AbortError}.
   */
  abort(reason?: any): void {
    this._abortController.abort(reason);
  }

  /**
   * Subscribes this promise to be aborted when the signal is aborted.
   *
   * @param signal The signal that aborts this promise.
   * @returns This promise.
   */
  withSignal(signal: AbortSignal): this {
    signal.addEventListener('abort', () => {
      this.abort(signal.reason);
    });
    return this;
  }
}
