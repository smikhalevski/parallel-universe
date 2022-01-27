import {sleep} from '../main';
import {newAbortError} from '../main/utils';

describe('sleep', () => {

  test('aborts if signal is aborted', async () => {
    const ac = new AbortController();
    ac.abort();

    await expect(sleep(1, ac.signal)).rejects.toEqual(newAbortError());
  });

  test('resolves after timeout', async () => {
    const ts = Date.now();
    await sleep(200);

    expect(Date.now() - ts).toBeGreaterThanOrEqual(199);
  });

  test('rejects when signal is aborted', async () => {
    const ac = new AbortController();
    const promise = sleep(500, ac.signal);
    const ts = Date.now();

    ac.abort();

    await expect(promise).rejects.toEqual(newAbortError());
    expect(Date.now() - ts).toBeLessThan(10);
  });
});
