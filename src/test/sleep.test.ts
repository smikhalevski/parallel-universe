import { sleep } from '../main';
import { createAbortError } from '../main/utils';

describe('sleep', () => {
  test('aborts if an aborted signal is provided', async () => {
    const abortController = new AbortController();
    abortController.abort();

    await expect(sleep(1, abortController.signal)).rejects.toEqual(createAbortError());
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

    await expect(promise).rejects.toEqual(createAbortError());
    expect(Date.now() - now).toBeLessThan(10);
  });
});
