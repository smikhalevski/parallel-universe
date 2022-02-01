interface Exception extends Error {

  // https://developer.mozilla.org/en-US/docs/Web/API/DOMException/code
  code?: number;
}

const Exception: new() => Exception = typeof DOMException !== 'undefined' ? DOMException : Error;

export function createAbortError(): Exception {
  const ex = new Exception();
  ex.name = 'AbortError';
  ex.code = 20;
  return ex;
}

export function createTimeoutError(): Exception {
  const ex = new Exception();
  ex.name = 'TimeoutError';
  ex.code = 23;
  return ex;
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
