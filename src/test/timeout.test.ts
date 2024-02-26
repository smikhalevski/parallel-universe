import { AbortablePromise, timeout } from '../main';

describe('timeout', () => {
  test('resolves if a promise if fulfilled before a timeout runs out', async () => {
    await expect(timeout(() => Promise.resolve(111), 1)).resolves.toEqual(111);
  });

  test('rejects if a timeout runs out', async () => {
    const promise = timeout(() => new Promise(() => {}), 50);

    await expect(promise).rejects.toEqual(new DOMException('', 'TimeoutError'));
  });

  test('rejects if a promise is rejected runs out', async () => {
    await expect(timeout(() => Promise.reject(111), 1)).rejects.toBe(111);
  });

  test('aborts the timeout', async () => {
    const promise = timeout(() => 111, 1);

    promise.abort();

    await expect(promise).rejects.toEqual(new DOMException('', 'AbortError'));
  });

  test('aborts the abortable promise', async () => {
    const promise1 = new AbortablePromise(() => {});
    const promise2 = timeout(promise1, 1);

    promise2.catch(() => {});

    promise2.abort();

    await expect(promise1).rejects.toEqual(new DOMException('', 'AbortError'));
  });
});
