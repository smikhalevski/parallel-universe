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
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('synchronously invokes a callback with signal', () => {
    const cbMock = jest.fn();
    executor.execute(cbMock);

    expect(cbMock).toHaveBeenCalledTimes(1);
    expect(cbMock.mock.calls[0][0].aborted).toBe(false);
  });

  test('synchronously resolves execution', () => {
    executor.execute(() => 111);

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.result).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('synchronously rejects execution', () => {
    executor.execute(() => {
      throw 222;
    });

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(true);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor.promise).toBe(null);
  });

  test('asynchronously resolves after execute', async () => {
    const promise = executor.execute(() => Promise.resolve(111));

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(promise);

    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.result).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('asynchronously rejects execution', async () => {
    const promise = executor.execute(() => Promise.reject(222));

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(promise);

    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(true);
    expect(executor.result).toBe(undefined);
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

    executor.execute(cbMock);

    const promise = executor.execute(() => Promise.resolve(222));

    expect(cbMock.mock.calls[0][0].aborted).toBe(true);
    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isSettled).toBe(false);
    expect(executor.result).toBe(undefined);

    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.result).toBe(222);
  });

  test('synchronously resolves', () => {
    executor.resolve(111);

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.result).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('asynchronously resolves', async () => {
    executor.resolve(Promise.resolve(111));

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBeInstanceOf(Promise);

    await executor.promise;

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.result).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('synchronously rejects', () => {
    executor.reject(222);

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(true);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor.promise).toBe(null);
  });

  test('stores only last result', () => {
    executor.reject(222);
    executor.resolve(111);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.result).toBe(111);
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
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor.promise).toBe(null);
  });

  test('preserves previous result on execute', () => {
    executor.resolve(111);
    const promise = executor.execute(() => Promise.resolve(333));

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(true);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.result).toBe(111);
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
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor.promise).toBe(promise);
  });

  test('does not invoke listener if result did not change after resolve', () => {
    executor.resolve(111);
    executor.resolve(111);

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  test('does not invoke listener if reason did not change after reject', () => {
    executor.reject(222);
    executor.reject(222);

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  test('does not invoke listener if result did not change after execute', () => {
    executor.resolve(111);
    executor.execute(() => 111);

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  test('does not invoke listener if reason did not change after execute', () => {
    executor.reject(222);
    executor.execute(() => {
      throw 222;
    });

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  test('clears after resolve', () => {
    executor.resolve(111);
    executor.clear();

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(false);
    expect(executor.isRejected).toBe(false);
    expect(executor.result).toBe(undefined);
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
    expect(executor.result).toBe(undefined);
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
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(promise);

    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(4);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.result).toBe(333);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('abort preserves result intact', () => {
    executor.resolve(111);
    executor.execute(() => Promise.resolve(333));
    executor.abort();

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.isPending).toBe(false);
    expect(executor.isFulfilled).toBe(true);
    expect(executor.isRejected).toBe(false);
    expect(executor.result).toBe(111);
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
    expect(executor.result).toBe(undefined);
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
    expect(executor.result).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  test('returns a default value if an executor is not fulfilled', () => {
    expect(executor.getOrDefault(222)).toBe(222);
  });

  test('returns a result if an executor is fulfilled', () => {
    executor.resolve(111);
    expect(executor.getOrDefault(222)).toBe(111);
  });
});
