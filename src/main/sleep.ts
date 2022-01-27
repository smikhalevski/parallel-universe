import {addSignalListener, newAbortError, removeSignalListener} from './utils';

export function sleep(ms: number, signal?: AbortSignal | null): Promise<undefined> {
  return new Promise<undefined>((resolve, reject) => {

    if (!signal) {
      setTimeout(resolve, ms);
      return;
    }

    if (signal.aborted) {
      reject(newAbortError());
      return;
    }

    const signalListener = () => {
      clearTimeout(timeout);
      reject(newAbortError());
    };

    const timeout = setTimeout(() => {
      removeSignalListener(signal, signalListener);
      resolve(undefined);
    }, ms);

    addSignalListener(signal, signalListener);
  });
}
