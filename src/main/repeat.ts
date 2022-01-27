import {addSignalListener, callOrGet, isPromiseLike, newAbortError, removeSignalListener} from './utils';

export function repeat<T>(cb: (signal: AbortSignal) => PromiseLike<T> | T, until: (result: T | undefined, reason: any, callCount: number) => boolean, ms?: number | ((result: T | undefined, reason: any, callCount: number) => number), signal?: AbortSignal | null): Promise<T> {
  return new Promise<T>((resolve, reject) => {

    if (signal?.aborted) {
      reject(newAbortError());
      return;
    }

    let callCount = -1;
    let timeout: ReturnType<typeof setTimeout>;
    let signalListener: () => void;

    const cbSignal = signal || new AbortController().signal;

    if (signal) {
      signalListener = () => {
        clearTimeout(timeout);
        reject(newAbortError());
      };
      addSignalListener(signal, signalListener);
    }

    const fulfillLoop = (result: any, reason: any, resolved: boolean): void => {
      if (signal?.aborted) {
        return;
      }
      ++callCount;

      let completed;

      try {
        completed = until(result, reason, callCount);
      } catch (error) {
        reject(error);
        return;
      }

      if (completed) {
        removeSignalListener(signal, signalListener);
        resolved ? resolve(result) : reject(reason);
        return;
      }

      timeout = setTimeout(loop, callOrGet(ms, result, reason, callCount) || 0);
    };

    const resolveLoop = (result: T) => {
      fulfillLoop(result, undefined, true);
    };

    const rejectLoop = (reason: any) => {
      fulfillLoop(undefined, reason, false);
    };

    const loop = () => {
      if (signal?.aborted) {
        return;
      }

      let result;
      try {
        result = cb(cbSignal);
      } catch (error) {
        rejectLoop(error);
        return;
      }

      if (isPromiseLike(result)) {
        result.then(resolveLoop, rejectLoop);
      } else {
        resolveLoop(result);
      }
    };

    loop();
  });
}
