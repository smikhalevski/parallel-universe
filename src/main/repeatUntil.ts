import { addAbortListener, callOrGet, newAbortError, newAbortSignal, removeAbortListener } from './utils';
import { AsyncResult, Awaitable } from './shared-types';
import { isPromiseLike } from './isPromiseLike';

/**
 * Invokes a callback periodically with the given delay between resolutions of the returned `Promise`.
 *
 * @param cb The callback that is periodically invoked.
 * @param until The callback that should return `true` to terminate the loop. `until` is called before the next
 *     iteration is scheduled.
 * @param ms The number of milliseconds between the resolution of the last `Promise` returned by the `cb` and the next
 *     invocation. Or a callback that receives the latest result and returns the delay. If omitted then delay is 0.
 * @param signal The optional signal that instantly aborts the loop.
 * @returns The `Promise` that resolves with the `cb` result. If `signal` was aborted then returned `Promise` is
 *     rejected with [`AbortError`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException#aborterror).
 */
export function repeatUntil<T>(
  cb: (signal: AbortSignal) => Awaitable<T>,
  until: (result: AsyncResult<T>) => boolean,
  ms?: ((result: AsyncResult<T>) => number) | number | null,
  signal?: AbortSignal | null
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cbSignal = signal || newAbortSignal();

    if (cbSignal.aborted) {
      reject(newAbortError());
      return;
    }

    let aborted = false;
    let timeout: ReturnType<typeof setTimeout>;

    const abortListener = (): void => {
      aborted = true;
      clearTimeout(timeout);
      reject(newAbortError());
    };

    addAbortListener(cbSignal, abortListener);

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
        removeAbortListener(cbSignal, abortListener);
        reject(error);
        return;
      }

      removeAbortListener(cbSignal, abortListener);
      if (result.resolved) {
        resolve(result.result);
      } else {
        reject(result.reason);
      }
    };

    const fulfillCycle = (result: T): void => {
      settleCycle({
        resolved: true,
        rejected: false,
        result,
        reason: undefined,
      });
    };

    const rejectCycle = (reason: unknown): void => {
      settleCycle({
        resolved: false,
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
