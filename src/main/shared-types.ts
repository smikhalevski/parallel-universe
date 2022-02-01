/**
 * The result of the async execution.
 *
 * @template T The type of the result value.
 */
export interface AsyncResult<T = any> {
  resolved: boolean;
  rejected: boolean;

  /**
   * The result value or `undefined` if failed.
   */
  result: T | undefined;

  /**
   * The reason of failure.
   */
  reason: any;
}

/**
 * The `Promise`-like value that can be settled using `await`.
 *
 * @template T The type of the result value.
 */
export type Awaitable<T> = PromiseLike<T> | T;
