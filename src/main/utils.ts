import { AbortablePromise } from './AbortablePromise.js';

export function noop() {}

export function withSignal<T>(value: T, signal: AbortSignal): T {
  return value instanceof AbortablePromise ? value.withSignal(signal) : value;
}
