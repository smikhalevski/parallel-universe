import {sleep, timeout} from '../main';
import {newAbortError, newTimeoutError} from '../main/utils';

describe('timeout', () => {

  test('resolves with value', async () => {
    await expect(timeout(() => 123, 1)).resolves.toBe(123);
  });

  test('rejects with error', async () => {
    await expect(timeout(() => {
      throw 123;
    }, 1)).rejects.toBe(123);
  });

  test('rejects after timeout', async () => {
    await expect(timeout(() => sleep(100), 1)).rejects.toEqual(newTimeoutError());
  });

  test('rejects with signal', async () => {
    const abortController = new AbortController();
    const promise = timeout(() => sleep(5000), 3000, abortController.signal);

    abortController.abort();

    await expect(promise).rejects.toEqual(newAbortError());
  });
});
