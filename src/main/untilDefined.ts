import {DelayCallback, repeat} from './repeat';
import {AwaitableLike, Maybe} from './util-types';

export function untilDefined<T>(cb: (signal: AbortSignal) => AwaitableLike<Maybe<T>>, ms?: DelayCallback<T> | number, signal?: Maybe<AbortSignal>): Promise<T> {
  return repeat(cb as () => T, isDefined, ms, signal);
}

function isDefined(result: unknown): boolean {
  return result != undefined;
}
