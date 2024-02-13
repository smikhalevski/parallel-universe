import { AbortablePromise } from './AbortablePromise';
import type { AbortableCallback } from './types';

/**
 * Invokes a callback periodically with the given delay between settlements of returned promises until the condition is
 * met. If callback throws an error or returns a rejected promise, then the promise returned from {@link repeat} is
 * rejected.
 *
 * @param cb The callback that is periodically invoked.
 * @param ms The number of milliseconds between the settlement of the last promise returned by the callback and the
 * next invocation. Or a callback that receives the latest result and returns the delay. If omitted then delay is 0.
 * @param until The callback that should return `true` to terminate the loop, or `false` to proceed to the next
 * iteration. The condition is checked before the next iteration is scheduled. If omitted then loop is repeated
 * indefinitely.
 * @template I The value returned by the callback.
 * @template O The value that fulfills the returned promise.
 * @returns The promise that is fulfilled with the callback result.
 */
export function repeat<I, O extends I>(
  cb: AbortableCallback<I>,
  ms: ((value: I, index: number) => number) | number,
  until: (value: I, index: number) => value is O
): AbortablePromise<O>;

/**
 * Invokes a callback periodically with the given delay between settlements of returned promises until the condition is
 * met. If callback throws an error or returns a rejected promise, then the promise returned from {@link repeat} is
 * rejected.
 *
 * @param cb The callback that is periodically invoked.
 * @param ms The number of milliseconds between the settlement of the last promise returned by the callback and the next
 * invocation. Or a callback that receives the latest result and returns the delay. If omitted then delay is 0.
 * @param until The callback that should return truthy value to terminate the loop, or falsy to proceed to the next
 * iteration. The condition is checked before the next iteration is scheduled. If omitted then loop is repeated
 * indefinitely.
 * @template T The value returned by the callback.
 * @returns The promise that is fulfilled with the callback result.
 */
export function repeat<T>(
  cb: AbortableCallback<T>,
  ms?: ((value: T, index: number) => number) | number,
  until?: (value: T, index: number) => unknown
): AbortablePromise<T>;

export function repeat(
  cb: AbortableCallback<unknown>,
  ms?: ((value: unknown, index: number) => number) | number,
  until?: (value: unknown, index: number) => unknown
): AbortablePromise<unknown> {
  return new AbortablePromise((resolve, reject, signal) => {
    let timer: NodeJS.Timeout;

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
    });

    (function next(index: number) {
      new Promise(resolve => {
        resolve(cb(signal));
      })
        .then(value => {
          if (signal.aborted) {
            return;
          }
          if (typeof until === 'function' && until(value, index)) {
            resolve(value);
            return;
          }
          timer = setTimeout(next, typeof ms === 'function' ? ms(value, index) : ms, index + 1);
        })
        .catch(reject);
    })(0);
  });
}
