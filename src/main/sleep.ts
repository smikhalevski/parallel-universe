import { addAbortListener, newAbortError, removeAbortListener } from './utils';

/**
 * Returns a promise that is fulfilled after a timeout.
 *
 * @param ms The timeout in milliseconds after which to resolve.
 * @param signal The optional signal that instantly aborts the sleep. If `signal` was aborted then returned promise is
 * rejected with {@linkcode https://developer.mozilla.org/en-US/docs/Web/API/DOMException#aborterror AbortError}.
 * @returns The promise that is fulfilled after a timeout.
 */
export function sleep(ms: number, signal?: AbortSignal | null): Promise<undefined> {
  return new Promise<undefined>((resolve, reject) => {
    if (!signal) {
      setTimeout(resolve, ms);
      return;
    }

    if (signal.aborted) {
      reject(newAbortError());
      return;
    }

    const abortListener = (): void => {
      clearTimeout(timeout);
      reject(newAbortError());
    };

    addAbortListener(signal, abortListener);

    const timeout = setTimeout(() => {
      removeAbortListener(signal, abortListener);
      resolve(undefined);
    }, ms);
  });
}
