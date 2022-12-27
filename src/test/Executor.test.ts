import { Executor } from '../main';

describe('Executor', () => {
  let listenerMock: jest.Mock;
  let executor: Executor<string | number>;

  beforeEach(() => {
    listenerMock = jest.fn();
    executor = new Executor();
    executor.subscribe(listenerMock);
  });

  it('creates a blank executor', () => {
    expect(listenerMock).not.toHaveBeenCalled();
    expect(executor.pending).toBe(false);
    expect(executor.fulfilled).toBe(false);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  it('synchronously invokes a callback with signal', () => {
    const cbMock = jest.fn();
    executor.execute(cbMock);

    expect(cbMock).toHaveBeenCalledTimes(1);
    expect(cbMock.mock.calls[0][0].aborted).toBe(false);
  });

  it('asynchronously resolves after execute', async () => {
    const promise = executor.execute(() => Promise.resolve(111));

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.pending).toBe(true);
    expect(executor.fulfilled).toBe(false);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(promise);

    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(false);
    expect(executor.fulfilled).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  it('asynchronously rejects execution', async () => {
    const promise = executor.execute(() => Promise.reject(222));

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.pending).toBe(true);
    expect(executor.fulfilled).toBe(false);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(promise);

    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(false);
    expect(executor.fulfilled).toBe(false);
    expect(executor.rejected).toBe(true);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor.promise).toBe(null);
  });

  it('notifies the listener on sequential asynchronous executions', () => {
    executor.execute(() => Promise.resolve(111));
    executor.execute(() => Promise.resolve(222));

    expect(listenerMock).toHaveBeenCalledTimes(2);
  });

  it('aborts pending execution if new execution is submitted', async () => {
    const cbMock = jest.fn(signal => Promise.resolve(111));

    executor.execute(cbMock);

    const promise = executor.execute(() => 222);

    expect(cbMock.mock.calls[0][0].aborted).toBe(true);
    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.settled).toBe(false);
    expect(executor.result).toBe(undefined);

    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.result).toBe(222);
  });

  it('synchronously resolves', () => {
    executor.resolve(111);

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.pending).toBe(false);
    expect(executor.fulfilled).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  it('asynchronously resolves', async () => {
    executor.resolve(Promise.resolve(111));

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.pending).toBe(true);
    expect(executor.fulfilled).toBe(false);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBeInstanceOf(Promise);

    await executor.promise;

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(false);
    expect(executor.fulfilled).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  it('synchronously rejects', () => {
    executor.reject(222);

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(executor.pending).toBe(false);
    expect(executor.fulfilled).toBe(false);
    expect(executor.rejected).toBe(true);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor.promise).toBe(null);
  });

  it('stores only last result', () => {
    executor.reject(222);
    executor.resolve(111);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(false);
    expect(executor.fulfilled).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  it('stores only last reason', () => {
    executor.resolve(111);
    executor.reject(222);

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(false);
    expect(executor.fulfilled).toBe(false);
    expect(executor.rejected).toBe(true);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor.promise).toBe(null);
  });

  it('preserves previous result on execute', () => {
    executor.resolve(111);
    const promise = executor.execute(() => Promise.resolve(333));

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(true);
    expect(executor.fulfilled).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(promise);
  });

  it('preserves previous reason on execute', () => {
    executor.reject(222);
    const promise = executor.execute(() => Promise.resolve(111));

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(true);
    expect(executor.fulfilled).toBe(false);
    expect(executor.rejected).toBe(true);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor.promise).toBe(promise);
  });

  it('does not invoke listener if result did not change after resolve', () => {
    executor.resolve(111);
    executor.resolve(111);

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  it('does not invoke listener if reason did not change after reject', () => {
    executor.reject(222);
    executor.reject(222);

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  it('clears after resolve', () => {
    executor.resolve(111);
    executor.clear();

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(false);
    expect(executor.fulfilled).toBe(false);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  it('clears after reject', () => {
    executor.reject(222);
    executor.clear();

    expect(listenerMock).toHaveBeenCalledTimes(2);
    expect(executor.pending).toBe(false);
    expect(executor.fulfilled).toBe(false);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  it('clear does not interrupt execution', async () => {
    executor.resolve(111);
    const promise = executor.execute(() => Promise.resolve(333));
    executor.clear();

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.pending).toBe(true);
    expect(executor.fulfilled).toBe(false);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(promise);

    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(4);
    expect(executor.pending).toBe(false);
    expect(executor.fulfilled).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(333);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  it('abort preserves result intact', () => {
    executor.resolve(111);
    executor.execute(() => Promise.resolve(333));
    executor.abort();

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.pending).toBe(false);
    expect(executor.fulfilled).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });

  it('abort preserves reason intact', () => {
    executor.reject(222);
    executor.execute(() => Promise.resolve(111));
    executor.abort();

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.pending).toBe(false);
    expect(executor.fulfilled).toBe(false);
    expect(executor.rejected).toBe(true);
    expect(executor.result).toBe(undefined);
    expect(executor.reason).toBe(222);
    expect(executor.promise).toBe(null);
  });

  it('aborts pending execution', async () => {
    executor.resolve(111);
    const promise = executor.execute(() => Promise.resolve(333));
    executor.abort();
    await promise;

    expect(listenerMock).toHaveBeenCalledTimes(3);
    expect(executor.pending).toBe(false);
    expect(executor.fulfilled).toBe(true);
    expect(executor.rejected).toBe(false);
    expect(executor.result).toBe(111);
    expect(executor.reason).toBe(undefined);
    expect(executor.promise).toBe(null);
  });
});
