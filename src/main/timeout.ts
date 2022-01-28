import {addAbortListener, isPromiseLike, newAbortError, newTimeoutError, removeAbortListener} from './utils';
import {AwaitableLike, Maybe} from './util-types';

export function timeout<T>(cb: PromiseLike<T> | ((signal: AbortSignal) => AwaitableLike<T>), ms: number, signal?: Maybe<AbortSignal>): Promise<T> {
  return new Promise<T>((resolve, reject) => {

    if (signal?.aborted) {
      reject(newAbortError());
      return;
    }

    let result;
    let abortController: AbortController | undefined;
    let abortListener: () => void;

    if (typeof cb === 'function') {
      abortController = new AbortController();
      result = cb(abortController.signal);
    } else {
      result = cb;
    }

    if (!isPromiseLike(result)) {
      resolve(result);
      return;
    }

    if (signal) {
      abortListener = () => {
        abortController?.abort();
        clearTimeout(timeout);
        reject(newAbortError());
      };
      addAbortListener(signal, abortListener);
    }

    const timeout = setTimeout(() => {
      abortController?.abort();
      removeAbortListener(signal, abortListener);
      reject(newTimeoutError());
    }, ms);

    result.then(
        (result) => {
          clearTimeout(timeout);
          removeAbortListener(signal, abortListener);
          resolve(result);
        },
        (reason) => {
          clearTimeout(timeout);
          removeAbortListener(signal, abortListener);
          reject(reason);
        },
    );
  });
}
