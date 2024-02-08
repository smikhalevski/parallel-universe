import { Deferred } from './Deferred';

/**
 * Returns a {@link Deferred} that is fulfilled after a timeout.
 *
 * Sleep operation can be prematurely {@link Deferred.resolve fulfilled} or {@link Deferred.reject rejected}.
 *
 * @param ms The timeout in milliseconds after which to resolve.
 * @returns The deferred that is fulfilled after a timeout.
 */
export function sleep(ms: number): Deferred<void>;

/**
 * Returns a {@link Deferred} that is fulfilled after a timeout with the given result.
 *
 * Sleep operation can be prematurely {@link Deferred.resolve fulfilled} or {@link Deferred.reject rejected}.
 *
 * @param ms The timeout in milliseconds after which to resolve.
 * @param result The fulfillment result.
 * @returns The deferred that is fulfilled after a timeout.
 * @template T The fulfillment result.
 */
export function sleep<T>(ms: number, result: T): Deferred<T>;

export function sleep(ms: number, result?: unknown): Deferred<any> {
  const deferred = new Deferred();
  const cancel = clearTimeout.bind(undefined, setTimeout(deferred.resolve, ms, result));

  deferred.then(cancel, cancel);

  return deferred;
}
