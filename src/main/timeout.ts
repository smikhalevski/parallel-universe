import { AbortablePromise } from './AbortablePromise';
import { AbortableCallback } from './types';

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
  if (cb instanceof AbortablePromise) {
    return timeout(signal => {
      signal.addEventListener('abort', () => {
        cb.abort(signal.reason);
      });

      return cb;
    }, ms);
  }

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

    new Promise<T>(resolveValue => {
      resolveValue(cb(signal));
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
