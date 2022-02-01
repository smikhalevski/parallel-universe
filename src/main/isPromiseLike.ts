export function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return value != null
      && typeof value === 'object'
      && typeof (value as PromiseLike<unknown>).then === 'function';
}
