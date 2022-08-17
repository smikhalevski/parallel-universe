import { sleep } from '../main';
import { newAbortError } from '../main/utils';

describe('sleep', () => {
  test('aborts if signal is aborted', async () => {
    const abortController = new AbortController();
    abortController.abort();

    await expect(sleep(1, abortController.signal)).rejects.toEqual(newAbortError());
  });

  test('resolves after timeout', async () => {
    const now = Date.now();
    await sleep(200);

    expect(Date.now() - now).toBeGreaterThanOrEqual(199);
  });

  test('rejects when signal is aborted', async () => {
    const abortController = new AbortController();
    const promise = sleep(500, abortController.signal);
    const now = Date.now();

    abortController.abort();

    await expect(promise).rejects.toEqual(newAbortError());
    expect(Date.now() - now).toBeLessThan(10);
  });
});
