function newDOMException(name: string, code: number, message?: string): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(message, name);
  }
  const error: any = new Error(message);
  error.name = name;
  error.code = code;
  return error;
}

export function newAbortError(message?: string): Error {
  return newDOMException('AbortError', 20, message);
}

export function newTimeoutError(message?: string): Error {
  return newDOMException('TimeoutError', 23, message);
}

export function callOrGet<T, A extends any[]>(value: ((...args: A) => T) | T, ...args: A): T {
  return typeof value === 'function' ? (value as Function)(...args) : value;
}

export function newAbortSignal(): AbortSignal {
  return new AbortController().signal;
}

export function addAbortListener(signal: AbortSignal, listener: () => void): void {
  signal.addEventListener('abort', listener);
}

export function removeAbortListener(signal: AbortSignal, listener: () => void): void {
  signal.removeEventListener('abort', listener);
}

export function noop() {}
