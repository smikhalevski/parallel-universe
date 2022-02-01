import {addAbortListener, createAbortError, removeAbortListener} from './utils';

/**
 * Returns a `Promise` that resolves after a timeout.
 *
 * @param ms The timeout in milliseconds after which to resolve.
 * @param signal The optional signal that instantly aborts the sleep.
 * @returns The `Promise` that resolves after a timeout. If `signal` was aborted then returned `Promise` is rejected
 *     with [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException) abort error.
 */
export function sleep(ms: number, signal?: AbortSignal | null): Promise<undefined> {
  return new Promise<undefined>((resolve, reject) => {

    if (!signal) {
      setTimeout(resolve, ms);
      return;
    }

    if (signal.aborted) {
      reject(createAbortError());
      return;
    }

    const abortListener = (): void => {
      clearTimeout(timeout);
      reject(createAbortError());
    };

    addAbortListener(signal, abortListener);

    const timeout = setTimeout(() => {
      removeAbortListener(signal, abortListener);
      resolve(undefined);
    }, ms);
  });
}
