import {callOrGet, newAbortError} from './utils';
import {sleep} from './sleep';

export function repeat<T>(cb: (signal: AbortSignal) => Promise<T> | T, until: (result: T | undefined, reason: any) => boolean, ms: number | ((callCount: number) => number) = 50, signal?: AbortSignal | null): Promise<T> {
  return new Promise<T>((resolve, reject) => {

    if (signal?.aborted) {
      reject(newAbortError());
    }

    const cbSignal = signal || new AbortSignal();

    let callCount = 0;

    const loopResolve = (result: T) => {
      if (until(result, undefined)) {
        resolve(result);
        return;
      }
      if (signal?.aborted) {
        return;
      }
      sleep(callOrGet(ms, callCount++), signal).then(loop);
    };

    const loopReject = (reason: any) => {
      if (until(undefined, reason)) {
        reject(reason);
        return;
      }
      if (signal?.aborted) {
        return;
      }
      sleep(callOrGet(ms, callCount++), signal).then(loop);
    };

    const loop = () => {
      let result;
      try {
        result = cb(cbSignal);
      } catch (error) {
        loopReject(error);
        return;
      }
      if (result instanceof Promise) {
        result.then(loopResolve, loopReject);
      } else {
        loopResolve(result);
      }
    };

    loop();
  });
}
