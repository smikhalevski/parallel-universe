import {repeatUntil} from '../main';
import {createAbortError} from '../main/utils';

describe('repeatUntil', () => {

  test('aborts if signal is aborted', async () => {
    const cbMock = jest.fn();
    const untilMock = jest.fn();
    const ac = new AbortController();
    ac.abort();

    await expect(repeatUntil(cbMock, untilMock, 0, ac.signal)).rejects.toEqual(createAbortError());
    expect(cbMock).not.toHaveBeenCalled();
  });

  test('aborts when signal is aborted', async () => {
    const cbMock = jest.fn();
    const untilMock = jest.fn();
    const ac = new AbortController();

    const promise = repeatUntil(cbMock, untilMock, 0, ac.signal);

    ac.abort();

    await expect(promise).rejects.toEqual(createAbortError());

    expect(cbMock).toHaveBeenCalled();
  });

  test('first callback invocation in synchronous', () => {
    const cbMock = jest.fn();

    repeatUntil(cbMock, () => true);

    expect(cbMock).toHaveBeenCalledTimes(1);
  });

  test('rejects if callback throws synchronously', async () => {
    await expect(repeatUntil(() => {
      throw 'foo';
    }, () => true)).rejects.toEqual('foo');
  });

  test('resolves with returned value', async () => {
    await expect(repeatUntil(() => 'foo', () => true)).resolves.toEqual('foo');
  });

  test('resolves if callback returns resolved Promise', async () => {
    await expect(repeatUntil(() => Promise.resolve('foo'), () => true)).resolves.toEqual('foo');
  });

  test('rejects if callback returns rejected Promise', async () => {
    await expect(repeatUntil(() => Promise.reject('foo'), () => true)).rejects.toEqual('foo');
  });

  test('rejects if until callback throws', async () => {
    await expect(repeatUntil(() => 'foo', () => {
      throw 'bar';
    })).rejects.toEqual('bar');
  });

  test('rejects if delay callback throws', async () => {
    await expect(repeatUntil(() => 'foo', () => false, () => {
      throw 'bar';
    })).rejects.toEqual('bar');
  });

  test('resolves when until callback returns true', async () => {
    let i = 0;
    await repeatUntil(() => 'foo', () => ++i === 3);

    expect(i).toBe(3);
  });

  test('passes result to until callback on resolve', async () => {
    const untilMock = jest.fn(() => true);

    await repeatUntil(() => 'foo', untilMock);

    expect(untilMock).toHaveBeenCalledTimes(1);
    expect(untilMock).toHaveBeenCalledWith({
      resolved: true,
      rejected: false,
      result: 'foo',
      reason: undefined,
    });
  });

  test('passes reason to until callback on reject', async () => {
    const untilMock = jest.fn(() => true);

    await expect(repeatUntil(() => {
      throw 'foo';
    }, untilMock)).rejects.toBe('foo');

    expect(untilMock).toHaveBeenCalledTimes(1);
    expect(untilMock).toHaveBeenCalledWith({
      resolved: false,
      rejected: true,
      result: undefined,
      reason: 'foo',
    });
  });

  test('passes result to delay callback on resolve', async () => {
    const delayMock = jest.fn();

    let i = 0;
    await repeatUntil(() => 'foo', () => ++i === 2, delayMock);

    expect(delayMock).toHaveBeenCalledTimes(1);
    expect(delayMock).toHaveBeenCalledWith({
      resolved: true,
      rejected: false,
      result: 'foo',
      reason: undefined,
    });
  });

  test('passes reason to delay callback on reject', async () => {
    const delayMock = jest.fn();

    let i = 0;
    await expect(repeatUntil(() => {
      throw 'foo';
    }, () => ++i === 2, delayMock)).rejects.toBe('foo');

    expect(delayMock).toHaveBeenCalledTimes(1);
    expect(delayMock).toHaveBeenCalledWith({
      resolved: false,
      rejected: true,
      result: undefined,
      reason: 'foo',
    });
  });
});
