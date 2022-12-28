import { callOrGet, createAbortError } from './utils';
import { AsyncResult, ExecutorCallback } from './shared-types';
import { isPromiseLike } from './isPromiseLike';

/**
 * Invokes a callback periodically with the given delay between settlements of returned promises.
 *
 * @param cb The callback that is periodically invoked.
 * @param until The callback that should return `true` to terminate the loop. `until` is called before the next
 * iteration is scheduled.
 * @param ms The number of milliseconds between the settlement of the last promise returned by the `cb` and the next
 * invocation. Or a callback that receives the latest result and returns the delay. If omitted then delay is 0.
 * @param signal The optional signal that instantly aborts the loop. If `signal` was aborted then returned promise is
 * rejected with {@linkcode https://developer.mozilla.org/en-US/docs/Web/API/DOMException#aborterror AbortError}.
 * @template I The value returned by the `cb`.
 * @template O The value that fulfills the returned promise.
 * @returns The promise that is fulfilled with the `cb` result.
 */
export function repeatUntil<I, O extends I>(
  cb: ExecutorCallback<I>,
  until: (result: AsyncResult<I>) => result is AsyncResult<O>,
  ms?: ((result: AsyncResult<O>) => number) | number | null,
  signal?: AbortSignal | null
): Promise<O>;

/**
 * Invokes a callback periodically with the given delay between settlements of returned promises.
 *
 * @param cb The callback that is periodically invoked.
 * @param until The callback that should return `true` to terminate the loop. `until` is called before the next
 * iteration is scheduled.
 * @param ms The number of milliseconds between the settlement of the last promise returned by the `cb` and the next
 * invocation. Or a callback that receives the latest result and returns the delay. If omitted then delay is 0.
 * @param signal The optional signal that instantly aborts the loop. If `signal` was aborted then returned promise is
 * rejected with {@linkcode https://developer.mozilla.org/en-US/docs/Web/API/DOMException#aborterror AbortError}.
 * @template T The async result value.
 * @returns The promise that is fulfilled with the `cb` result.
 */
export function repeatUntil<T>(
  cb: ExecutorCallback<T>,
  until: (result: AsyncResult<T>) => boolean,
  ms?: ((result: AsyncResult<T>) => number) | number | null,
  signal?: AbortSignal | null
): Promise<T>;

export function repeatUntil(
  cb: ExecutorCallback<unknown>,
  until: (result: AsyncResult<unknown>) => boolean,
  ms?: ((result: AsyncResult<unknown>) => number) | number | null,
  signal?: AbortSignal | null
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const cbSignal = signal || new AbortController().signal;

    if (cbSignal.aborted) {
      reject(createAbortError());
      return;
    }

    let aborted = false;
    let timeout: ReturnType<typeof setTimeout>;

    const abortListener = (): void => {
      aborted = true;
      clearTimeout(timeout);
      reject(createAbortError());
    };

    cbSignal.addEventListener('abort', abortListener);

    const settleCycle = (result: AsyncResult): void => {
      if (aborted) {
        return;
      }
      try {
        if (!until(result)) {
          timeout = setTimeout(cycle, callOrGet(ms, result) || 0);
          return;
        }
      } catch (error) {
        cbSignal.removeEventListener('abort', abortListener);
        reject(error);
        return;
      }

      cbSignal.removeEventListener('abort', abortListener);
      if (result.fulfilled) {
        resolve(result.result);
      } else {
        reject(result.reason);
      }
    };

    const fulfillCycle = (result: unknown): void => {
      settleCycle({
        settled: true,
        fulfilled: true,
        rejected: false,
        result,
        reason: undefined,
      });
    };

    const rejectCycle = (reason: unknown): void => {
      settleCycle({
        settled: true,
        fulfilled: false,
        rejected: true,
        result: undefined,
        reason,
      });
    };

    const cycle = (): void => {
      if (aborted) {
        return;
      }
      let result;
      try {
        result = cb(cbSignal);
      } catch (error) {
        rejectCycle(error);
        return;
      }
      if (isPromiseLike(result)) {
        result.then(fulfillCycle, rejectCycle);
      } else {
        fulfillCycle(result);
      }
    };

    cycle();
  });
}
