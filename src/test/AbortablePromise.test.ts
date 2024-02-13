import { AbortablePromise } from '../main';

describe('AbortablePromise', () => {
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
  });
});
