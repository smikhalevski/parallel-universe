import { repeatUntil } from './repeatUntil';
import { AsyncResult, ExecutorCallback } from './shared-types';

/**
 * Returns a promise that is fulfilled when a callback returns a truthy value, or a promise that is fulfilled with a
 * truthy value.
 *
 * @param cb The callback that is periodically invoked.
 * @param ms The number of milliseconds between the settlement of the last promise returned by the `cb` and the next
 * invocation. Or a callback that receives the latest result and returns the delay. If omitted then delay is 0.
 * @param signal The optional signal that instantly aborts the loop. If `signal` was aborted then returned promise is
 * rejected with {@linkcode https://developer.mozilla.org/en-US/docs/Web/API/DOMException#aborterror AbortError}.
 * @template T The value returned by the callback.
 * @returns The truthy value.
 */
export function untilTruthy<T>(
  cb: ExecutorCallback<T>,
  ms?: ((result: AsyncResult<T>) => number) | number | null,
  signal?: AbortSignal | null
): Promise<Exclude<T, 0 | '' | false | null | undefined>> {
  return repeatUntil<any>(cb, isTruthyFulfilled, ms, signal);
}

function isTruthyFulfilled<T>(result: AsyncResult<T>): result is AsyncResult {
  return result.rejected || Boolean(result.result);
}
