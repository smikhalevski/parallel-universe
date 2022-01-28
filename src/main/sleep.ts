import {addAbortListener, newAbortError, removeAbortListener} from './utils';
import {Maybe} from './util-types';

export function sleep(ms: number, signal?: Maybe<AbortSignal>): Promise<undefined> {
  return new Promise<undefined>((resolve, reject) => {

    if (!signal) {
      setTimeout(resolve, ms);
      return;
    }

    if (signal.aborted) {
      reject(newAbortError());
      return;
    }

    const abortListener = () => {
      clearTimeout(timeout);
      reject(newAbortError());
    };

    addAbortListener(signal, abortListener);

    const timeout = setTimeout(() => {
      removeAbortListener(signal, abortListener);
      resolve(undefined);
    }, ms);
  });
}
