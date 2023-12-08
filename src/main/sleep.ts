/**
 * Returns a promise that is fulfilled after a timeout.
 *
 * @param ms The timeout in milliseconds after which to resolve.
 * @param signal The optional signal that instantly aborts the sleep with an {@link !Error Error}.
 * @returns The promise that is fulfilled after a timeout.
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!signal) {
      setTimeout(resolve, ms);
      return;
    }

    if (signal.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    const abortListener = () => {
      clearTimeout(timeout);
      reject(new Error('Aborted'));
    };

    signal.addEventListener('abort', abortListener);

    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', abortListener);
      resolve();
    }, ms);
  });
}
