import { ExecutorCallback } from './shared-types';
import { toPromise } from './utils';

/**
 * Returns a promise that is rejected after the timeout elapses.
 *
 * @param cb The callback receives a signal that is aborted if the timeout elapses.
 * @param ms The timeout after which the promise is rejected with a {@linkcode TimeoutError}.
 * @returns The fulfilled value.
 */
export function raceTimeout<T>(cb: ExecutorCallback<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const abortController = new AbortController();

    const timeout = setTimeout(() => {
      abortController.abort();
      reject(new Error('Timeout'));
    }, ms);

    toPromise(
      () => cb(abortController.signal),
      result => {
        clearTimeout(timeout);
        resolve(result);
      },
      reason => {
        clearTimeout(timeout);
        reject(reason);
      }
    );
  });
}
