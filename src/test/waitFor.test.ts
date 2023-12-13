import { waitFor } from '../main';

describe('waitFor', () => {
  test('first callback invocation in synchronous', () => {
    const cbMock = jest.fn();

    cbMock.mockImplementationOnce(() => false);
    cbMock.mockImplementationOnce(() => true);

    waitFor(cbMock);

    expect(cbMock).toHaveBeenCalledTimes(1);
  });

  test('does not reject if callback throws synchronously', async () => {
    const cbMock = jest.fn();

    cbMock.mockImplementationOnce(() => {
      throw 111;
    });
    cbMock.mockImplementationOnce(() => 222);

    await expect(waitFor(cbMock)).resolves.toEqual(222);
  });

  test('resolves with returned value', async () => {
    await expect(waitFor(() => 111)).resolves.toEqual(111);
  });

  test('resolves if callback returns a fulfilled promise', async () => {
    await expect(waitFor(() => Promise.resolve(111))).resolves.toEqual(111);
  });

  test('does not reject if callback returns rejected promise', async () => {
    const cbMock = jest.fn();

    cbMock.mockImplementationOnce(() => Promise.reject(111));
    cbMock.mockImplementationOnce(() => Promise.resolve(222));

    await expect(waitFor(cbMock)).resolves.toEqual(222);
  });

  test('rejects if ms callback throws', async () => {
    await expect(
      waitFor(
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

    await waitFor(cbMock, msMock);

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
