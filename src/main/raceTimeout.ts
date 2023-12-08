import { AbortableCallback } from './types';
import { isPromiseLike } from './utils';

/**
 * Returns a promise that is rejected after the timeout elapses.
 *
 * @param cb The callback receives a signal that is aborted if the timeout elapses.
 * @param ms The timeout after which the promise is rejected with an {@link !Error Error}.
 * @returns The fulfilled value.
 */
export function raceTimeout<T>(cb: AbortableCallback<T>, ms: number): Promise<T>;

export function raceTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T>;

export function raceTimeout<T>(cb: AbortableCallback<T> | PromiseLike<T>, ms: number): Promise<T> {
  if (isPromiseLike(cb)) {
    return raceTimeout(() => cb, ms);
  }
  return new Promise((resolve, reject) => {
    const abortController = new AbortController();

    const timeout = setTimeout(() => {
      abortController.abort();
      reject(new Error('Timeout'));
    }, ms);

    new Promise<T>(resolve => {
      resolve(cb(abortController.signal));
    }).then(
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
