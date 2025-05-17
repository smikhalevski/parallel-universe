import { AbortablePromise } from './AbortablePromise.js';
import { AbortableCallback } from './types.js';
import { withSignal } from './utils.js';

/**
 * Returns a promise that is fulfilled with a produced value, or rejected after the timeout elapses.
 *
 * @param cb A callback that receives a signal that is aborted if the timeout elapses, or a promise-like object.
 * @param ms The timeout after which the returned promise is rejected.
 * @returns The promise that is fulfilled before a timeout elapses, or rejected with a
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/DOMException#timeouterror TimeoutError}.
 * @template T The value returned from the callback or promise.
 */
export function timeout<T>(cb: AbortableCallback<T> | PromiseLike<T>, ms: number): AbortablePromise<T> {
  if (typeof cb !== 'function') {
    return timeout(() => cb, ms);
  }

  return new AbortablePromise<T>((resolve, reject, signal) => {
    const timer = setTimeout(() => {
      reject(new DOMException('', 'TimeoutError'));
    }, ms);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
    });

    new Promise<T>(resolve => {
      resolve(withSignal(cb(signal), signal));
    }).then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      reason => {
        clearTimeout(timer);
        reject(reason);
      }
    );
  });
}
