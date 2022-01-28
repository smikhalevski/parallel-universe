import {addAbortListener, callOrGet, isPromiseLike, newAbortError, removeAbortListener} from './utils';
import {AwaitableLike, Maybe} from './util-types';

export type UntilCallback<T> = (result: T | undefined, reason: any, resolved: boolean) => boolean;

export type DelayCallback<T> = (result: T | undefined, reason: any, resolved: boolean) => number;

export function repeat<T>(cb: (signal: AbortSignal) => AwaitableLike<T>, until: UntilCallback<T>, ms?: DelayCallback<T> | number, signal?: Maybe<AbortSignal>): Promise<T> {
  return new Promise<T>((resolve, reject) => {

    if (signal?.aborted) {
      reject(newAbortError());
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;
    let abortListener: () => void;

    const cbSignal = signal || new AbortController().signal;

    if (signal) {
      abortListener = () => {
        clearTimeout(timeout);
        reject(newAbortError());
      };
      addAbortListener(signal, abortListener);
    }

    const fulfillLoop = (result: any, reason: unknown, resolved: boolean): void => {
      if (signal?.aborted) {
        return;
      }
      try {
        if (!until(result, reason, resolved)) {
          timeout = setTimeout(loop, callOrGet(ms, result, reason, resolved) || 0);
          return;
        }
      } catch (error) {
        removeAbortListener(signal, abortListener);
        reject(error);
        return;
      }
      removeAbortListener(signal, abortListener);
      if (resolved) {
        resolve(result);
      } else {
        reject(reason);
      }
    };

    const resolveLoop = (result: T) => {
      fulfillLoop(result, undefined, true);
    };

    const rejectLoop = (reason: unknown) => {
      fulfillLoop(undefined, reason, false);
    };

    const loop = () => {
      try {
        const result = cb(cbSignal);
        if (isPromiseLike(result)) {
          result.then(resolveLoop, rejectLoop);
        } else {
          resolveLoop(result);
        }
      } catch (error) {
        rejectLoop(error);
      }
    };

    loop();
  });
}
