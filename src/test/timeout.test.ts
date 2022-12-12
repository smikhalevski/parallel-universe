import { sleep, timeout } from '../main';
import { createAbortError, createTimeoutError } from '../main/utils';

describe('timeout', () => {
  test('aborts if an aborted signal is provided', async () => {
    const cbMock = jest.fn();
    const abortController = new AbortController();
    abortController.abort();

    await expect(timeout(cbMock, 1, abortController.signal)).rejects.toEqual(createAbortError());
    expect(cbMock).not.toHaveBeenCalled();
  });

  test('rejects if synchronous callback throws', async () => {
    await expect(
      timeout(() => {
        throw 111;
      }, 1)
    ).rejects.toBe(111);
  });

  test('resolves synchronous callback', async () => {
    await expect(timeout(() => 111, 1)).resolves.toBe(111);
  });

  test('rejects if asynchronous callback rejects', async () => {
    await expect(timeout(() => Promise.reject(111), 1)).rejects.toBe(111);
  });

  test('resolves asynchronous callback', async () => {
    await expect(timeout(() => Promise.resolve(111), 1)).resolves.toBe(111);
  });

  test('aborts if timeout expires', async () => {
    await expect(timeout(signal => sleep(100, signal), 1)).rejects.toEqual(createTimeoutError());
  });

  test('aborts when signal is aborted', async () => {
    const abortController = new AbortController();
    const promise = timeout(signal => sleep(1_000, signal), 100, abortController.signal);

    abortController.abort();

    await expect(promise).rejects.toEqual(createAbortError());
  });
});
