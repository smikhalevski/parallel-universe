const Exception = typeof DOMException !== 'undefined' ? DOMException : Error;

export function newAbortError(): Error {
  return new Exception('AbortError');
}

export function newTimeoutError(): Error {
  return new Exception('TimeoutError');
}

export function callOrGet<T, A extends unknown[]>(value: ((...args: A) => T) | T, ...args: A): T {
  return typeof value === 'function' ? (value as Function)(...args) : value;
}
