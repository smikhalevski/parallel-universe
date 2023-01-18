/**
 * The callback that receives a signal that is aborted when execution must be stopped, and returns the execution result.
 *
 * @template T The returned result.
 */
export type ExecutorCallback<T> = (signal: AbortSignal) => Awaitable<T>;

/**
 * The promise-like value that can be settled using `await`.
 *
 * @template T The result value.
 */
export type Awaitable<T> = PromiseLike<T> | T;

/**
 * The result of the async execution.
 *
 * @template T The result value.
 */
export interface AsyncResult<T = any> {
  /**
   * `true` if result was fulfilled or rejected, or `false` otherwise.
   */
  settled: boolean;

  /**
   * `true` if the result was fulfilled with a value, or `false` otherwise.
   */
  fulfilled: boolean;

  /**
   * `true` if the result was rejected with a reason, or `false` otherwise.
   */
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
