import { delay, repeat } from '../main';

describe('repeat', () => {
  test('first callback invocation in synchronous', () => {
    const cbMock = jest.fn();

    repeat(cbMock, 0, () => true);

    expect(cbMock).toHaveBeenCalledTimes(1);
  });

  test('resolves with returned value', async () => {
    await expect(
      repeat(
        () => 111,
        0,
        () => true
      )
    ).resolves.toEqual(111);
  });

  test('resolves if callback returns a fulfilled promise', async () => {
    await expect(
      repeat(
        () => Promise.resolve(111),
        0,
        () => true
      )
    ).resolves.toEqual(111);
  });

  test('rejects if callback throws', async () => {
    await expect(
      repeat(() => {
        throw new Error('expected');
      })
    ).rejects.toEqual(new Error('expected'));
  });

  test('rejects if callback returns rejected promise', async () => {
    await expect(repeat(() => Promise.reject(111))).rejects.toEqual(111);
  });

  test('rejects if until callback throws', async () => {
    await expect(
      repeat(
        () => 111,
        0,
        () => {
          throw new Error('expected');
        }
      )
    ).rejects.toEqual(new Error('expected'));
  });

  test('rejects if ms callback throws', async () => {
    await expect(
      repeat(
        () => 111,
        () => {
          throw new Error('expected');
        }
      )
    ).rejects.toEqual(new Error('expected'));
  });

  test('resolves when until callback returns true', async () => {
    const cbMock = jest.fn();
    const untilMock = jest.fn();

    untilMock.mockReturnValueOnce(false);
    untilMock.mockReturnValueOnce(false);
    untilMock.mockReturnValueOnce(true);

    await repeat(cbMock, 0, untilMock);

    expect(cbMock).toHaveBeenCalledTimes(3);
  });

  test('passes value to until callback on resolve', async () => {
    const untilMock = jest.fn();

    untilMock.mockReturnValueOnce(false);
    untilMock.mockReturnValueOnce(true);

    await repeat(() => 111, 0, untilMock);

    expect(untilMock).toHaveBeenCalledTimes(2);
    expect(untilMock).toHaveBeenCalledWith(111, 0);
    expect(untilMock).toHaveBeenCalledWith(111, 1);
  });

  test('passes value to ms callback on resolve', async () => {
    const msMock = jest.fn();
    const untilMock = jest.fn();

    untilMock.mockReturnValueOnce(false);
    untilMock.mockReturnValueOnce(false);
    untilMock.mockReturnValueOnce(true);

    await repeat(() => 111, msMock, untilMock);

    expect(msMock).toHaveBeenCalledTimes(2);
    expect(msMock).toHaveBeenCalledWith(111, 0);
    expect(msMock).toHaveBeenCalledWith(111, 1);
  });

  test('aborts the repetition', async () => {
    const cbMock = jest.fn();

    const promise = repeat(cbMock);

    promise.abort();

    await expect(promise).rejects.toEqual(new DOMException('', 'AbortError'));

    await delay(100);

    expect(cbMock).toHaveBeenCalledTimes(1);
  });
});
