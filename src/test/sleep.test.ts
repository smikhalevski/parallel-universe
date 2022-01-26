import {sleep} from '../main';
import {newAbortError} from '../main/utils';

describe('sleep', () => {

  test('resolves after timeout', async () => {
    const timestamp = Date.now();
    await sleep(200);

    expect(Date.now() - timestamp).toBeGreaterThanOrEqual(199);
  });

  test('rejects with AbortError when signal is aborted', async () => {
    const abortController = new AbortController();
    const promise = sleep(500, abortController.signal);
    const timestamp = Date.now();

    setTimeout(() => abortController.abort(), 100);

    await expect(promise).rejects.toEqual(newAbortError());
    expect(Date.now() - timestamp).toBeLessThan(150);
  });

  test('instantly aborts if signal is aborted', async () => {
    const abortController = new AbortController();
    abortController.abort();

    await expect(sleep(500, abortController.signal)).rejects.toEqual(newAbortError());
  });
});
