import { AbortablePromise } from '../main';

describe('AbortablePromise', () => {
  test('creates an instance of promise', () => {
    const promise = new AbortablePromise((resolve, reject, signal) => {});

    expect(promise).toBeInstanceOf(Promise);
    expect(promise).toBeInstanceOf(AbortablePromise);
  });

  test('resolves with a value', async () => {
    const promise = new AbortablePromise((resolve, reject, signal) => {
      setTimeout(resolve, 0, 111);
    });

    await expect(promise).resolves.toBe(111);
  });

  test('aborts the signal', done => {
    const promise = new AbortablePromise((resolve, reject, signal) => {
      signal.addEventListener('abort', () => {
        done();
      });
    });

    promise.abort();

    promise.catch(() => {});
  });

  test('rejects if aborted', async () => {
    const promise = new AbortablePromise((resolve, reject, signal) => {
      setTimeout(resolve, 0, 111);
    });

    promise.abort();

    await expect(promise).rejects.toThrow(new DOMException('This operation was aborted'));
  });

  test('rejects with an abort reason', async () => {
    const promise = new AbortablePromise((resolve, reject, signal) => {
      setTimeout(resolve, 0, 1111);
    });

    promise.abort(new Error('expected'));

    await expect(promise).rejects.toThrow(new Error('expected'));
  });

  test('abort is noop after promise is resolved', async () => {
    const promise = new AbortablePromise((resolve, reject, signal) => {
      resolve(111);
    });

    promise.abort();

    await expect(promise).resolves.toBe(111);
    expect(promise['_abortController'].signal.aborted).toBe(true);
  });

  test('aborts if signal is aborted asynchronously', async () => {
    const promise = new AbortablePromise(() => {});
    const abortController = new AbortController();

    promise.withSignal(abortController.signal);

    abortController.abort(111);

    await expect(promise).rejects.toBe(abortController.signal.reason);
  });

  test('does not abort if an external signal is not aborted', async () => {
    const promise = new AbortablePromise(resolve => {
      resolve(111);
    });
    const abortController = new AbortController();

    promise.withSignal(abortController.signal);

    await expect(promise).resolves.toBe(111);
  });

  test('aborts if an external signal is aborted asynchronously', async () => {
    const promise = new AbortablePromise(() => {});
    const abortController = new AbortController();

    promise.withSignal(abortController.signal);

    abortController.abort(111);

    await expect(promise).rejects.toBe(abortController.signal.reason);
  });

  test('aborts if an external signal is aborted before subscription', async () => {
    const promise = new AbortablePromise(() => {});
    const abortController = new AbortController();

    abortController.abort(111);

    promise.withSignal(abortController.signal);

    await expect(promise).rejects.toBe(abortController.signal.reason);
  });
});
