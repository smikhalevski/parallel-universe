import { createAbortError, createTimeoutError } from './utils';
import { Awaitable } from './shared-types';
import { isPromiseLike } from './isPromiseLike';

/**
 * Returns a promise that is settled after a result returned from the promise is settled, or after a provided promise
 * is settled, or if the timeout runs out.
 *
 * @param cb The promise or a callback that returns a promise.
 * @param ms The timeout after which the returned promise is rejected with a
 * {@linkcode https://developer.mozilla.org/en-US/docs/Web/API/DOMException#timeouterror TimeoutError}.
 * @param signal The optional signal that instantly aborts the timeout. If `signal` was aborted then returned promise
 * is rejected with {@linkcode https://developer.mozilla.org/en-US/docs/Web/API/DOMException#aborterror AbortError}.
 * @returns The fulfilled value.
 */
export function timeout<T>(
  cb: PromiseLike<T> | ((signal: AbortSignal) => Awaitable<T>),
  ms: number,
  signal?: AbortSignal | null
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cbSignal = signal || new AbortController().signal;

    if (cbSignal.aborted) {
      reject(createAbortError());
      return;
    }

    let aborted = false;

    const abortListener = (): void => {
      aborted = true;
      clearTimeout(timeout);
      reject(createAbortError());
    };

    cbSignal.addEventListener('abort', abortListener);

    const result = isPromiseLike(cb) ? cb : cb(cbSignal);

    if (aborted) {
      return;
    }

    if (!isPromiseLike(result)) {
      resolve(result);
      return;
    }

    const timeout = setTimeout(() => {
      cbSignal.removeEventListener('abort', abortListener);
      reject(createTimeoutError());
    }, ms);

    result.then(
      result => {
        clearTimeout(timeout);
        cbSignal.removeEventListener('abort', abortListener);
        resolve(result);
      },
      reason => {
        clearTimeout(timeout);
        cbSignal.removeEventListener('abort', abortListener);
        reject(reason);
      }
    );
  });
}
