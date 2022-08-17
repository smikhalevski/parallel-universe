import {
  addAbortListener,
  newAbortError,
  newAbortSignal,
  newTimeoutError,
  removeAbortListener,
} from './utils';
import { Awaitable } from './shared-types';
import { isPromiseLike } from './isPromiseLike';

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
