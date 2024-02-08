import { AbortablePromise } from './AbortablePromise';
import { Deferred } from './Deferred';
import { AbortableCallback } from './types';
import { isPromiseLike } from './utils';

/**
 * Returns a deferred that is rejected after the timeout elapses.
 *
 * Timeout operation can be prematurely {@link Deferred.resolve fulfilled} or {@link Deferred.reject rejected}. In such
 * case the signal passed to the callback is aborted, {@link AbortablePromise} is aborted as well, and a settlement
 * value of a promise-like object is ignored.
 *
 * @param cb The callback receives a signal that is aborted if the timeout elapses, an {@link AbortablePromise}, or
 * any other promise-like object.
 * @param ms The timeout after which the returned deferred is rejected.
 * @returns The deferred that is fulfilled before a timeout runs out, or rejected with a
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/DOMException#timeouterror TimeoutError}.
 * @template T The value returned from the callback or promise.
 */
export function timeout<T>(cb: AbortableCallback<T> | AbortablePromise<T> | PromiseLike<T>, ms: number): Deferred<T> {
  if (cb instanceof AbortablePromise) {
    return timeout(signal => {
      signal.addEventListener('abort', () => {
        cb.abort(signal.reason);
      });

      return cb;
    }, ms);
  }

  if (isPromiseLike(cb)) {
    return timeout(() => cb, ms);
  }

  const deferred = new Deferred<T>();
  const abortController = new AbortController();

  const clear = clearTimeout.bind(
    undefined,
    setTimeout(() => {
      abortController.abort(new DOMException('Timeout', 'TimeoutError'));
      deferred.reject(abortController.signal.reason);
    }, ms)
  );

  deferred.then(clear, clear);

  try {
    deferred.resolve(cb(abortController.signal));
  } catch (error) {
    deferred.reject(error);
  }

  return deferred;
}
