import { Executor } from '../main';

describe('Executor', () => {
  let listenerMock: jest.Mock;
  let executor: Executor<string | number>;

  beforeEach(() => {
    listenerMock = jest.fn();
    executor = new Executor();
    executor.subscribe(listenerMock);
  });

  test('creates a blank executor', () => {
    expect(listenerMock).not.toHaveBeenCalled();
    expect(executor.isSettled).toBe(false);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('synchronously invokes a callback with signal', async () => {
    const cbMock = jest.fn();
    const promise = executor.execute(cbMock);

    expect(cbMock).toHaveBeenCalledTimes(1);
    expect(cbMock.mock.calls[0][0].aborted).toBe(false);
    await expect(promise).resolves.toEqual({
      isSettled: true,
      isFulfilled: true,
      isRejected: false,
      result: undefined,
      reason: undefined,
    });
  });

  test('synchronously resolves after execute', () => {
    executor.execute(() => 111);

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('synchronously rejects after execute', () => {
    executor.execute(() => {
      throw 222;
    });

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(true);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor.promise).toBe(null);
  });

  test('asynchronously resolves after execute', async () => {
    const promise = executor.execute(() => Promise.resolve(111));

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(promise);

    await expect(promise).resolves.toEqual({
      isSettled: true,
      isFulfilled: true,
      isRejected: false,
      result: 111,
      reason: undefined,
    });

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('asynchronously rejects execution', async () => {
    const promise = executor.execute(() => Promise.reject(222));

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(promise);

    await expect(promise).resolves.toEqual({
      isSettled: true,
      isFulfilled: false,
      isRejected: true,
      result: undefined,
      reason: 222,
    });

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(true);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor.promise).toBe(null);
  });

  test('notifies the listener on sequential asynchronous executions', () => {
    executor.execute(() => Promise.resolve(111));
    executor.execute(() => Promise.resolve(222));

    expect(listenerMock).toHaveBeenCalledTimes(2);
  });

  test('aborts pending execution if new execution is submitted', async () => {
    const cbMock = jest.fn(signal => Promise.resolve(111));

    const promise1 = executor.execute(cbMock);

    const promise2 = executor.execute(() => Promise.resolve(222));

    expect(cbMock.mock.calls[0][0].aborted).toBe(true);
    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isSettled).toBe(false);
    expect(executor.value).toBe(undefined);

    await expect(promise2).resolves.toEqual({
      isSettled: true,
      isFulfilled: true,
      isRejected: false,
      result: 222,
      reason: undefined,
    });

    await expect(promise1).resolves.toEqual({
      isSettled: true,
      isFulfilled: false,
      isRejected: true,
      result: undefined,
      reason: new Error('Aborted'),
    });

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.value).toBe(222);
  });

  test('synchronously resolves', () => {
    executor.resolve(111);

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('asynchronously resolves', async () => {
    executor.resolve(Promise.resolve(111));

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBeInstanceOf(Promise);

    await executor.promise;

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('synchronously rejects', () => {
    executor.reject(222);

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(true);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor.promise).toBe(null);
  });

  test('stores only last value', () => {
    executor.reject(222);
    executor.resolve(111);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('stores only last reason', () => {
    executor.resolve(111);
    executor.reject(222);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(true);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor.promise).toBe(null);
  });

  test('preserves previous value on execute', () => {
    executor.resolve(111);
    const promise = executor.execute(() => Promise.resolve(333));

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(promise);
  });

  test('preserves previous reason on execute', () => {
    executor.reject(222);
    const promise = executor.execute(() => Promise.resolve(111));

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(true);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor.promise).toBe(promise);
  });

  test('does not invoke listener if value did not change after resolve', () => {
    executor.resolve(111);
    executor.resolve(111);

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  test('does not invoke listener if reason did not change after reject', () => {
    executor.reject(222);
    executor.reject(222);

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  test('clears after resolve', () => {
    executor.resolve(111);
    executor.clear();

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('clears after reject', () => {
    executor.reject(222);
    executor.clear();

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('clear does not interrupt execution', async () => {
    executor.resolve(111);
    const promise = executor.execute(() => Promise.resolve(333));
    executor.clear();

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(promise);

    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(4);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(333);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('abort preserves value intact', () => {
    executor.resolve(111);
    executor.execute(() => Promise.resolve(333));
    executor.abort();

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('abort preserves reason intact', () => {
    executor.reject(222);
    executor.execute(() => Promise.resolve(111));
    executor.abort();

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(true);
    expect(executor.value).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor.promise).toBe(null);
  });

  test('aborts pending execution', async () => {
    executor.resolve(111);
    const promise = executor.execute(() => Promise.resolve(333));
    executor.abort();
    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.value).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('returns a default value if an executor is not fulfilled', () => {
    expect(executor.getOrDefault(222)).toBe(222);
  });

  test('returns a value if an executor is fulfilled', () => {
    executor.resolve(111);
    expect(executor.getOrDefault(222)).toBe(111);
  });
});
