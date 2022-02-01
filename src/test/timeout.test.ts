import {sleep, timeout} from '../main';
import {createAbortError, createTimeoutError} from '../main/utils';

describe('timeout', () => {

  test('aborts if signal is aborted', async () => {
    const cbMock = jest.fn();
    const ac = new AbortController();
    ac.abort();

    await expect(timeout(cbMock, 1, ac.signal)).rejects.toEqual(createAbortError());
    expect(cbMock).not.toHaveBeenCalled();
  });

  test('rejects if synchronous callback throws', async () => {
    await expect(timeout(() => {
      throw 'aaa';
    }, 1)).rejects.toBe('aaa');
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
    await expect(timeout((signal) => sleep(100, signal), 1)).rejects.toEqual(createTimeoutError());
  });

  test('aborts when signal is aborted', async () => {
    const ac = new AbortController();
    const promise = timeout((signal) => sleep(1_000, signal), 100, ac.signal);

    ac.abort();

    await expect(promise).rejects.toEqual(createAbortError());
  });
});
