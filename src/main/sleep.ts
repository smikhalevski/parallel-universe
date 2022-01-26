import {newAbortError} from './utils';

export function sleep(ms: number, signal?: AbortSignal | null): Promise<undefined> {
  return new Promise<undefined>((resolve, reject) => {

    if (signal?.aborted) {
      reject(newAbortError());
    }

    const timeout = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(newAbortError());
    });
  });
}
