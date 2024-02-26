import { delay } from '../main';

jest.useFakeTimers();

describe('delay', () => {
  test('resolves after a timeout passes', async () => {
    const done = jest.fn();

    delay(200).then(done);

    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(done).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(done).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(500);
    await Promise.resolve();

    expect(done).toHaveBeenCalledTimes(1);
  });

  test('resolves with undefined', async () => {
    const promise = delay(200);

    jest.runAllTimers();

    await expect(promise).resolves.toBeUndefined();
  });

  test('resolves with a value', async () => {
    const promise = delay(200, 'aaa');

    jest.runAllTimers();

    await expect(promise).resolves.toBe('aaa');
  });

  test('aborts the delay', async () => {
    const promise = delay(200);

    promise.abort();

    const expectPromise = expect(promise).rejects.toEqual(new DOMException('', 'AbortError'));

    await jest.runAllTimersAsync();

    await expectPromise;
  });
});
