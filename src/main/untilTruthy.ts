import { repeatUntil } from './repeatUntil';
import { AsyncResult, Awaitable } from './shared-types';

/**
 * Polls the callback until it returns a truthy value.
 *
 * @param cb The callback that is periodically invoked.
 * @param ms The number of milliseconds between the settlement of the last promise returned by the `cb` and the next
 * invocation. Or a callback that receives the latest result and returns the delay. If omitted then delay is 0.
 * @template T The value returned by the callback.
 * @returns The truthy value.
 */
export function untilTruthy<T>(
  cb: () => Awaitable<T>,
  ms?: ((result: AsyncResult<T>) => number) | number
): Promise<Exclude<T, 0 | '' | false | null | undefined>> {
  return repeatUntil<any>(cb, result => result.rejected || result.result, ms);
}
