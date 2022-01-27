import {addSignalListener, isPromiseLike, newAbortError, newTimeoutError, removeSignalListener} from './utils';

export function timeout<T>(cb: (signal: AbortSignal) => PromiseLike<T> | T, ms: number, signal?: AbortSignal | null): Promise<T> {
  return new Promise<T>((resolve, reject) => {

    if (signal?.aborted) {
      reject(newAbortError());
      return;
    }

    const ac = new AbortController();
    const result = cb(ac.signal);

    if (!isPromiseLike(result)) {
      resolve(result);
      return;
    }

    let signalListener: () => void;

    if (signal) {
      signalListener = () => {
        ac.abort();
        clearTimeout(timeout);
        reject(newAbortError());
      };
      addSignalListener(signal, signalListener);
    }

    const timeout = setTimeout(() => {
      ac.abort();
      removeSignalListener(signal, signalListener);
      reject(newTimeoutError());
    }, ms);

    result.then(
        (result) => {
          removeSignalListener(signal, signalListener);
          clearTimeout(timeout);
          resolve(result);
        },
        (reason) => {
          removeSignalListener(signal, signalListener);
          clearTimeout(timeout);
          reject(reason);
        },
    );
  });
}
