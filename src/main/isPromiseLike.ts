/**
 * Returns `true` is value has `then` property that is a function.
 */
export function isPromiseLike<T>(value: any): value is PromiseLike<T> {
  return value != null && typeof value === 'object' && typeof value.then === 'function';
}
