import { Awaitable } from './shared-types';

export function noop() {}

/**
 * [SameValueZero](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-samevaluezero) comparison.
 */
export function isEqual(a: unknown, b: unknown): boolean {
  return a === b || (a !== a && b !== b);
}

/**
 * Returns `true` is value has `then` property that is a function.
 */
export function isPromiseLike<T>(value: any): value is PromiseLike<T> {
  return value !== null && typeof value === 'object' && typeof value.then === 'function';
}

/**
 * Invokes the callback and wraps it in a promise. `resolve` and `reject` callbacks are invoked synchronously if the
 * `cb` returns non-promise-like value.
 */
export function toPromise<T, R1, R2>(
  cb: () => Awaitable<T>,
  resolve: (result: T) => R1,
  reject: (reason: any) => R2
): Promise<R1 | R2> {
  return new Promise(next => {
    let result;

    try {
      result = cb();
    } catch (error) {
      next(reject(error));
      return;
    }
    if (isPromiseLike(result)) {
      next(result.then(resolve, reject));
    } else {
      next(resolve(result));
    }
  });
}
