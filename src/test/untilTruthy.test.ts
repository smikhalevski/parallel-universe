import { untilTruthy } from '../main';

describe('untilTruthy', () => {
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

  test('resolves if callback returns a fulfilled promise', async () => {
    await expect(untilTruthy(() => Promise.resolve(111))).resolves.toEqual(111);
  });

  test('rejects if callback returns rejected promise', async () => {
    await expect(untilTruthy(() => Promise.reject(111))).rejects.toEqual(111);
  });

  test('rejects if ms callback throws', async () => {
    await expect(
      untilTruthy(
        () => false,
        () => {
          throw 222;
        }
      )
    ).rejects.toEqual(222);
  });

  test('passes result to ms callback on resolve', async () => {
    const cbMock = jest.fn();
    const msMock = jest.fn();

    cbMock.mockImplementationOnce(() => 0);
    cbMock.mockImplementationOnce(() => true);

    await untilTruthy(cbMock, msMock);

    expect(msMock).toHaveBeenCalledTimes(1);
    expect(msMock).toHaveBeenCalledWith({
      isSettled: true,
      isFulfilled: true,
      isRejected: false,
      result: 0,
      reason: undefined,
    });
  });
});
