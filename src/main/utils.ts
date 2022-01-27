const Exception = typeof DOMException !== 'undefined' ? DOMException : Error;

export function newAbortError(): Error {
  const ex = new Exception();
  ex.name = 'AbortError';
  return ex;
}

export function newTimeoutError(): Error {
  const ex = new Exception();
  ex.name = 'TimeoutError';
  return ex;
}

export function callOrGet<T, A extends unknown[]>(value: ((...args: A) => T) | T, ...args: A): T {
  return typeof value === 'function' ? (value as Function)(...args) : value;
}

export function identity<T>(value: T): T {
  return value;
}

export function addSignalListener(signal: AbortSignal | null | undefined, listener: () => void): void {
  signal?.addEventListener('abort', listener);
}

export function removeSignalListener(signal: AbortSignal | null | undefined, listener: () => void): void {
  signal?.removeEventListener('abort', listener);
}

export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return value != null && typeof value === 'object' && 'then' in value;
}
