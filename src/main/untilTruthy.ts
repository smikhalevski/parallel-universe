import { repeatUntil } from './repeatUntil';
import { AsyncResult, Awaitable } from './shared-types';

type Falsy = 0 | '' | false | null | undefined;

/**
 * Returns a promise that is fulfilled when a callback returns a truthy value, or a promise that is fulfilled with a
 * truthy value.
 *
 * @param cb The callback that is periodically invoked.
 * @param ms The number of milliseconds between the settlement of the last promise returned by the `cb` and the next
 * invocation. Or a callback that receives the latest result and returns the delay. If omitted then delay is 0.
 * @param signal The optional signal that instantly aborts the loop. If `signal` was aborted then returned promise is
 * rejected with [`AbortError`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException#aborterror).
 * @template T The value returned by the callback.
 * @returns The truthy value.
 */
export function untilTruthy<T>(
  cb: (signal: AbortSignal) => Awaitable<T>,
  ms?: ((result: AsyncResult<T>) => number) | number | null,
  signal?: AbortSignal | null
): Promise<Exclude<T, Falsy>> {
  return repeatUntil(cb, isTruthyFulfilled, ms, signal);
}

function isTruthyFulfilled<T>(result: AsyncResult<T>): result is AsyncResult<Exclude<T, Falsy>> {
  return result.rejected || Boolean(result.result);
}
