import {sleep, timeout} from '../main';
import {newAbortError, newTimeoutError} from '../main/utils';

describe('timeout', () => {

  test('aborts if signal is aborted', async () => {
    const cbMock = jest.fn();
    const ac = new AbortController();
    ac.abort();

    await expect(timeout(cbMock, 1, ac.signal)).rejects.toEqual(newAbortError());
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
    await expect(timeout(() => sleep(100), 1)).rejects.toEqual(newTimeoutError());
  });

  test('aborts when signal is aborted', async () => {
    const ac = new AbortController();
    const promise = timeout(() => sleep(1_000), 100, ac.signal);

    ac.abort();

    await expect(promise).rejects.toEqual(newAbortError());
  });
});
