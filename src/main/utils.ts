function createDOMException(name: string, code: number, message?: string): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(message, name);
  }
  const error: Error & { code?: number } = new Error(message);
  error.name = name;
  error.code = code;
  return error;
}

export function createAbortError(message?: string): Error {
  return createDOMException('AbortError', 20, message);
}

export function createTimeoutError(message?: string): Error {
  return createDOMException('TimeoutError', 23, message);
}

export function callOrGet<T, A extends any[]>(value: ((...args: A) => T) | T, ...args: A): T {
  return typeof value === 'function' ? (value as Function)(...args) : value;
}

export function noop() {}
