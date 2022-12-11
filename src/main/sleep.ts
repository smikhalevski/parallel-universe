import { createAbortError } from './utils';

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
    if (signal == null) {
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

    signal.addEventListener('abort', abortListener);

    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', abortListener);
      resolve(undefined);
    }, ms);
  });
}
