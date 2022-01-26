import {repeat} from './repeat';

export function until<T>(cb: (signal: AbortSignal) => Promise<T | null | undefined> | T | null | undefined, ms: number | ((callCount: number) => number) = 50, signal?: AbortSignal | null): Promise<T> {
  return repeat(cb as () => T, isDefined, ms, signal);
}

function isDefined(result: any): boolean {
  return result != null;
}
