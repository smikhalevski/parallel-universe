import { delay } from '../main';

jest.useFakeTimers();

describe('delay', () => {
  test('instantly aborts if an aborted signal is provided', async () => {
    const abortController = new AbortController();
    abortController.abort();

    await expect(delay(200, abortController.signal)).rejects.toEqual(new Error('Aborted'));
  });

  test('resolves after a timeout passes', async () => {
    const listenerMock = jest.fn();

    delay(200).then(() => {
      listenerMock();
    });

    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(listenerMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  test('rejects when signal is aborted', async () => {
    const abortController = new AbortController();
    const promise = delay(200, abortController.signal);

    abortController.abort();

    await expect(promise).rejects.toEqual(new Error('Aborted'));
  });
});
