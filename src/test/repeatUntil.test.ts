import { repeatUntil } from '../main';

describe('repeatUntil', () => {
  test('first callback invocation in synchronous', () => {
    const cbMock = jest.fn();

    repeatUntil(cbMock, () => true);

    expect(cbMock).toHaveBeenCalledTimes(1);
  });

  test('rejects if callback throws synchronously', async () => {
    await expect(
      repeatUntil(
        () => {
          throw 111;
        },
        () => true
      )
    ).rejects.toEqual(111);
  });

  test('resolves with returned value', async () => {
    await expect(
      repeatUntil(
        () => 111,
        () => true
      )
    ).resolves.toEqual(111);
  });

  test('resolves if callback returns a fulfilled promise', async () => {
    await expect(
      repeatUntil(
        () => Promise.resolve(111),
        () => true
      )
    ).resolves.toEqual(111);
  });

  test('rejects if callback returns rejected promise', async () => {
    await expect(
      repeatUntil(
        () => Promise.reject(111),
        () => true
      )
    ).rejects.toEqual(111);
  });

  test('rejects if until callback throws', async () => {
    await expect(
      repeatUntil(
        () => 111,
        () => {
          throw 222;
        }
      )
    ).rejects.toEqual(222);
  });

  test('rejects if ms callback throws', async () => {
    await expect(
      repeatUntil(
        () => 111,
        () => false,
        () => {
          throw 222;
        }
      )
    ).rejects.toEqual(222);
  });

  test('resolves when until callback returns true', async () => {
    const cbMock = jest.fn();
    const untilMock = jest.fn();

    untilMock.mockReturnValueOnce(false);
    untilMock.mockReturnValueOnce(false);
    untilMock.mockReturnValueOnce(true);

    await repeatUntil(cbMock, untilMock);

    expect(cbMock).toHaveBeenCalledTimes(3);
  });

  test('passes result to until callback on resolve', async () => {
    const untilMock = jest.fn(() => true);

    await repeatUntil(() => 111, untilMock);

    expect(untilMock).toHaveBeenCalledTimes(1);
    expect(untilMock).toHaveBeenCalledWith({
      settled: true,
      fulfilled: true,
      rejected: false,
      result: 111,
      reason: undefined,
    });
  });

  test('passes reason to until callback on reject', async () => {
    const untilMock = jest.fn(() => true);

    await expect(
      repeatUntil(() => {
        throw 111;
      }, untilMock)
    ).rejects.toBe(111);

    expect(untilMock).toHaveBeenCalledTimes(1);
    expect(untilMock).toHaveBeenCalledWith({
      settled: true,
      fulfilled: false,
      rejected: true,
      result: undefined,
      reason: 111,
    });
  });

  test('passes result to ms callback on resolve', async () => {
    const msMock = jest.fn();
    const untilMock = jest.fn();

    untilMock.mockReturnValueOnce(false);
    untilMock.mockReturnValueOnce(true);

    await repeatUntil(() => 111, untilMock, msMock);

    expect(msMock).toHaveBeenCalledTimes(1);
    expect(msMock).toHaveBeenCalledWith({
      settled: true,
      fulfilled: true,
      rejected: false,
      result: 111,
      reason: undefined,
    });
  });

  test('passes reason to ms callback on reject', async () => {
    const msMock = jest.fn();
    const untilMock = jest.fn();

    untilMock.mockReturnValueOnce(false);
    untilMock.mockReturnValueOnce(true);

    await expect(
      repeatUntil(
        () => {
          throw 111;
        },
        untilMock,
        msMock
      )
    ).rejects.toBe(111);

    expect(msMock).toHaveBeenCalledTimes(1);
    expect(msMock).toHaveBeenCalledWith({
      settled: true,
      fulfilled: false,
      rejected: true,
      result: undefined,
      reason: 111,
    });
  });
});
