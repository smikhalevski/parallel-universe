interface Exception extends Error {
  // https://developer.mozilla.org/en-US/docs/Web/API/DOMException/code
  code?: number;
}

const Exception: new() => Exception = typeof DOMException !== 'undefined' ? DOMException : Error;

export function newAbortError(): Error {
  const error = new Exception();
  error.name = 'AbortError';
  error.code = 20;
  return error;
}

export function newTimeoutError(): Error {
  const error = new Exception();
  error.name = 'TimeoutError';
  error.code = 23;
  return error;
}

export function callOrGet<T, A extends unknown[]>(value: ((...args: A) => T) | T, ...args: A): T {
  return typeof value === 'function' ? (value as Function)(...args) : value;
}

export function identity<T>(value: T): T {
  return value;
}

export function addAbortListener(signal: AbortSignal | null | undefined, listener: () => void): void {
  signal?.addEventListener('abort', listener);
}

export function removeAbortListener(signal: AbortSignal | null | undefined, listener: () => void): void {
  signal?.removeEventListener('abort', listener);
}

export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return value != null && typeof value === 'object' && 'then' in value;
}
