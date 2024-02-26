/**
 * The callback that receives a signal that is aborted when execution must be stopped, and returns the execution value.
 *
 * @template T The returned value.
 */
export type AbortableCallback<T> = (signal: AbortSignal) => Awaitable<T>;

/**
 * The promise-like value that can be settled using `await`.
 *
 * @template T The result value.
 */
export type Awaitable<T> = PromiseLike<T> | T;
