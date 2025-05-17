import { AbortablePromise } from './AbortablePromise.js';
import { Awaitable } from './types.js';
import { withSignal } from './utils.js';

/**
 * Invokes a callback periodically until it successfully returns the result. If a callback throws an error or returns
 * a promise that is rejected then it is invoked again after a delay.
 *
 * @param cb The callback that must return the fulfilled result.
 * @param ms The number of milliseconds between the rejection of the last promise returned by the callback and the next
 * invocation. Or a callback that receives the latest error and returns the delay. If omitted then delay is 0.
 * @param maxCount The maximum number of retries after which the last rejection reason is thrown.
 * @template T The value returned by the callback.
 * @returns The promise that is fulfilled with the callback result.
 * @see {@link repeat}
 */
export function retry<T>(
  cb: (signal: AbortSignal, index: number) => Awaitable<T>,
  ms?: ((error: any, index: number) => number) | number,
  maxCount?: number
): AbortablePromise<T> {
  return new AbortablePromise((resolve, reject, signal) => {
    let timer: number;

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
    });

    (function next(index: number) {
      new Promise<T>(resolve => {
        resolve(withSignal(cb(signal, index), signal));
      }).then(resolve, reason => {
        if (signal.aborted) {
          return;
        }
        if (maxCount !== undefined && index >= maxCount - 1) {
          reject(reason);
          return;
        }
        timer = setTimeout(next, typeof ms === 'function' ? ms(reason, index) : ms, index + 1);
      });
    })(0);
  });
}
