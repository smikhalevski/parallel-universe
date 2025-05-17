import { AbortablePromise } from './AbortablePromise.js';
import { repeat } from './repeat.js';
import { Awaitable } from './types.js';

/**
 * Polls the callback until it returns a truthy value or rejects.
 *
 * @param cb The callback that is periodically invoked.
 * @param ms The number of milliseconds between the settlement of the last promise returned by the callback and the next
 * invocation. Or a callback that receives the latest value and returns the delay. If omitted then delay is 0.
 * @template T The value returned by the callback.
 * @returns The truthy value.
 */
export function waitFor<T>(
  cb: (signal: AbortSignal, index: number) => Awaitable<T>,
  ms?: ((value: T, index: number) => number) | number
): AbortablePromise<Exclude<T, false | 0 | '' | null | undefined>> {
  return repeat<any>(cb, ms, Boolean);
}
