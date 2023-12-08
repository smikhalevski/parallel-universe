import { AsyncResult, Awaitable } from './shared-types';

/**
 * Invokes a callback periodically with the given delay between settlements of returned promises until the condition is
 * met.
 *
 * @param cb The callback that is periodically invoked.
 * @param until The callback that should return `true` to terminate the loop, or `false` to proceed to the next
 * iteration. `until` is called before the next iteration is scheduled.
 * @param ms The number of milliseconds between the settlement of the last promise returned by the `cb` and the
 * next invocation. Or a callback that receives the latest result and returns the delay. If omitted then delay is 0.
 * @template I The value returned by the `cb`.
 * @template O The value that fulfills the returned promise.
 * @returns The promise that is fulfilled with the `cb` result.
 */
export function repeatUntil<I, O extends I>(
  cb: () => Awaitable<I>,
  until: (result: AsyncResult<I>) => result is AsyncResult<O>,
  ms?: ((result: AsyncResult<O>) => number) | number
): Promise<O>;

/**
 * Invokes a callback periodically with the given delay between settlements of returned promises until the condition is
 * met.
 *
 * @param cb The callback that is periodically invoked.
 * @param until The callback that should return truthy value to terminate the loop, or falsy to proceed to the next
 * iteration. `until` is called before the next iteration is scheduled.
 * @param ms The number of milliseconds between the settlement of the last promise returned by the `cb` and the next
 * invocation. Or a callback that receives the latest result and returns the delay. If omitted then delay is 0.
 * @template T The async result value.
 * @returns The promise that is fulfilled with the `cb` result.
 */
export function repeatUntil<T>(
  cb: () => Awaitable<T>,
  until: (result: AsyncResult<T>) => unknown,
  ms?: ((result: AsyncResult<T>) => number) | number
): Promise<T>;

export function repeatUntil(
  cb: () => Awaitable<unknown>,
  until: (result: AsyncResult<unknown>) => unknown,
  ms?: ((result: AsyncResult<unknown>) => number) | number
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const next = (result: AsyncResult) => {
      try {
        if (!until(result)) {
          setTimeout(execute, typeof ms === 'function' ? ms(result) : ms);
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }

      if (result.isFulfilled) {
        resolve(result.result);
      } else {
        reject(result.reason);
      }
    };

    const execute = () => {
      new Promise(resolve => {
        resolve(cb());
      }).then(
        result => {
          next({ isSettled: true, isFulfilled: true, isRejected: false, result, reason: undefined });
        },
        reason => {
          next({ isSettled: true, isFulfilled: false, isRejected: true, result: undefined, reason });
        }
      );
    };

    execute();
  });
}
