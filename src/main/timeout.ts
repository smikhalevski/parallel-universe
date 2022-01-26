import {newAbortError, newTimeoutError} from './utils';

export function timeout<T>(cb: (signal: AbortSignal) => Promise<T> | T, ms: number, signal?: AbortSignal | null): Promise<T> {
  return new Promise<T>((resolve, reject) => {

    if (signal?.aborted) {
      return reject(newAbortError());
    }

    const abortController = new AbortController();
    const result = cb(abortController.signal);

    if (!(result instanceof Promise)) {
      return resolve(result);
    }

    signal?.addEventListener('abort', () => {
      abortController.abort();
      clearTimeout(timeout);
      reject(newAbortError());
    });

    const timeout = setTimeout(() => {
      abortController.abort();
      reject(newTimeoutError());
    }, ms);

    result.then(
        (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        (reason) => {
          clearTimeout(timeout);
          reject(reason);
        },
    );
  });
}
