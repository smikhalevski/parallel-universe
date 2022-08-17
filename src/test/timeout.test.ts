import { sleep, timeout } from '../main';
import { newAbortError, newTimeoutError } from '../main/utils';

describe('timeout', () => {
  test('aborts if signal is aborted', async () => {
    const cbMock = jest.fn();
    const abortController = new AbortController();
    abortController.abort();

    await expect(timeout(cbMock, 1, abortController.signal)).rejects.toEqual(newAbortError());
    expect(cbMock).not.toHaveBeenCalled();
  });

  test('rejects if synchronous callback throws', async () => {
    await expect(
      timeout(() => {
        throw 'aaa';
      }, 1)
    ).rejects.toBe('aaa');
  });

  test('resolves synchronous callback', async () => {
    await expect(timeout(() => 'aaa', 1)).resolves.toBe('aaa');
  });

  test('rejects if asynchronous callback rejects', async () => {
    await expect(timeout(() => Promise.reject('aaa'), 1)).rejects.toBe('aaa');
  });

  test('resolves asynchronous callback', async () => {
    await expect(timeout(() => Promise.resolve('aaa'), 1)).resolves.toBe('aaa');
  });

  test('aborts if timeout expires', async () => {
    await expect(timeout(signal => sleep(100, signal), 1)).rejects.toEqual(newTimeoutError());
  });

  test('aborts when signal is aborted', async () => {
    const abortController = new AbortController();
    const promise = timeout(signal => sleep(1_000, signal), 100, abortController.signal);

    abortController.abort();

    await expect(promise).rejects.toEqual(newAbortError());
  });
});
