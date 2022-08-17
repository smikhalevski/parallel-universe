import { addAbortListener, newAbortError, newAbortSignal, newTimeoutError, removeAbortListener } from './utils';
import { Awaitable } from './shared-types';
import { isPromiseLike } from './isPromiseLike';

/**
 * Returns a promise that is settled after a result returned from the promise is settled, or after a provided promise
 * is settled, or if the timeout runs out.
 *
 * @param cb The promise or a callback that returns a promise.
 * @param ms The timeout after which the returned promise is rejected with a
 * [`TimeoutError`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException#timeouterror).
 * @param signal The optional signal that instantly aborts the timeout. If `signal` was aborted then returned promise
 * is rejected with [`AbortError`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException#aborterror).
 * @returns The fulfilled value.
 */
export function timeout<T>(
  cb: PromiseLike<T> | ((signal: AbortSignal) => Awaitable<T>),
  ms: number,
  signal?: AbortSignal | null
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cbSignal = signal || newAbortSignal();

    if (cbSignal.aborted) {
      reject(newAbortError());
      return;
    }

    let aborted = false;

    const abortListener = (): void => {
      aborted = true;
      clearTimeout(timeout);
      reject(newAbortError());
    };

    addAbortListener(cbSignal, abortListener);

    const result = isPromiseLike(cb) ? cb : cb(cbSignal);

    if (aborted) {
      return;
    }

    if (!isPromiseLike(result)) {
      resolve(result);
      return;
    }

    const timeout = setTimeout(() => {
      removeAbortListener(cbSignal, abortListener);
      reject(newTimeoutError());
    }, ms);

    result.then(
      result => {
        clearTimeout(timeout);
        removeAbortListener(cbSignal, abortListener);
        resolve(result);
      },
      reason => {
        clearTimeout(timeout);
        removeAbortListener(cbSignal, abortListener);
        reject(reason);
      }
    );
  });
}
