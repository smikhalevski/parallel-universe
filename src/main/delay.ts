import { AbortablePromise } from './AbortablePromise.js';
import { Awaitable } from './types.js';

/**
 * Returns a promise that is fulfilled with `undefined` after a timeout elapses.
 *
 * @param ms The timeout in milliseconds after which the returned promise is fulfilled.
 * @returns The promise that is fulfilled after a timeout.
 */
export function delay(ms: number): AbortablePromise<void>;

/**
 * Returns a promise that is fulfilled with a value after a timeout elapses.
 *
 * @param ms The timeout in milliseconds after which the returned promise is fulfilled.
 * @param value The value to fulfill the promise with.
 * @returns The promise that is fulfilled with the value after the timeout elapses.
 * @template T The value to fulfill the promise with.
 */
export function delay<T>(ms: number, value: Awaitable<T>): AbortablePromise<T>;

export function delay(ms: number, value?: unknown): AbortablePromise<unknown> {
  return new AbortablePromise((resolve, _reject, signal) => {
    const timer = setTimeout(resolve, ms, value);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
    });
  });
}
