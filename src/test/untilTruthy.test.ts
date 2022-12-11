import { untilTruthy } from '../main';
import { createAbortError } from '../main/utils';

describe('untilTruthy', () => {
  test('aborts if an aborted signal is provided', async () => {
    const cbMock = jest.fn();
    const abortController = new AbortController();
    abortController.abort();

    await expect(untilTruthy(cbMock, 0, abortController.signal)).rejects.toEqual(createAbortError());
    expect(cbMock).not.toHaveBeenCalled();
  });

  test('aborts when signal is aborted', async () => {
    const cbMock = jest.fn();
    const abortController = new AbortController();

    const promise = untilTruthy(cbMock, 0, abortController.signal);

    abortController.abort();

    await expect(promise).rejects.toEqual(createAbortError());

    expect(cbMock).toHaveBeenCalled();
  });

  test('first callback invocation in synchronous', () => {
    const cbMock = jest.fn();

    cbMock.mockImplementationOnce(() => false);
    cbMock.mockImplementationOnce(() => true);

    untilTruthy(cbMock);

    expect(cbMock).toHaveBeenCalledTimes(1);
  });

  test('rejects if callback throws synchronously', async () => {
    await expect(
      untilTruthy(() => {
        throw 111;
      })
    ).rejects.toEqual(111);
  });

  test('resolves with returned value', async () => {
    await expect(untilTruthy(() => 111)).resolves.toEqual(111);
  });

  test('resolves if callback returns a fulfilled Promise', async () => {
    await expect(untilTruthy(() => Promise.resolve(111))).resolves.toEqual(111);
  });

  test('rejects if callback returns rejected Promise', async () => {
    await expect(untilTruthy(() => Promise.reject(111))).rejects.toEqual(111);
  });

  test('rejects if delay callback throws', async () => {
    await expect(
      untilTruthy(
        () => false,
        () => {
          throw 222;
        }
      )
    ).rejects.toEqual(222);
  });

  test('passes result to delay callback on resolve', async () => {
    const cbMock = jest.fn();
    const delayMock = jest.fn();

    cbMock.mockImplementationOnce(() => 0);
    cbMock.mockImplementationOnce(() => true);

    await untilTruthy(cbMock, delayMock);

    expect(delayMock).toHaveBeenCalledTimes(1);
    expect(delayMock).toHaveBeenCalledWith({
      settled: true,
      fulfilled: true,
      rejected: false,
      result: 0,
      reason: undefined,
    });
  });
});
