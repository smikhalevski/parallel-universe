import { untilTruthy } from '../main';
import { newAbortError } from '../main/utils';

describe('untilTruthy', () => {
  test('aborts if an aborted signal is provided', async () => {
    const cbMock = jest.fn();
    const abortController = new AbortController();
    abortController.abort();

    await expect(untilTruthy(cbMock, 0, abortController.signal)).rejects.toEqual(newAbortError());
    expect(cbMock).not.toHaveBeenCalled();
  });

  test('aborts when signal is aborted', async () => {
    const cbMock = jest.fn();
    const abortController = new AbortController();

    const promise = untilTruthy(cbMock, 0, abortController.signal);

    abortController.abort();

    await expect(promise).rejects.toEqual(newAbortError());

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
        throw 'foo';
      })
    ).rejects.toEqual('foo');
  });

  test('resolves with returned value', async () => {
    await expect(untilTruthy(() => 'foo')).resolves.toEqual('foo');
  });

  test('resolves if callback returns a fulfilled Promise', async () => {
    await expect(untilTruthy(() => Promise.resolve('foo'))).resolves.toEqual('foo');
  });

  test('rejects if callback returns rejected Promise', async () => {
    await expect(untilTruthy(() => Promise.reject('foo'))).rejects.toEqual('foo');
  });

  test('rejects if delay callback throws', async () => {
    await expect(
      untilTruthy(
        () => false,
        () => {
          throw 'bar';
        }
      )
    ).rejects.toEqual('bar');
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
