function createError(name: string, message?: string): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(message, name);
  }
  const error = new Error(message);
  error.name = name;
  return error;
}

export function createAbortError(): Error {
  return createError('AbortError');
}

export function createTimeoutError(): Error {
  return createError('TimeoutError');
}

export function callOrGet<T, A extends unknown[]>(value: ((...args: A) => T) | T, ...args: A): T {
  return typeof value === 'function' ? (value as Function)(...args) : value;
}

export function createAbortSignal(): AbortSignal {
  return new AbortController().signal;
}

export function addAbortListener(signal: AbortSignal, listener: () => void): void {
  signal.addEventListener('abort', listener);
}

export function removeAbortListener(signal: AbortSignal, listener: () => void): void {
  signal.removeEventListener('abort', listener);
}

export function noop() {
}
