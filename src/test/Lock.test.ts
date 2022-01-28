import {Lock} from '../main';

describe('Lock', () => {

  test('the new lock is unlocked', () => {
    expect(new Lock().locked).toBe(false);
  });

  test('acquiring the lock returns a Promise', async () => {
    await expect(new Lock().acquire()).resolves.toBeInstanceOf(Function);
  });

  test('provides the exclusive lock ownership', async () => {
    const lock = new Lock();

    const releasePromise1 = lock.acquire();
    const releasePromise2 = lock.acquire();

    let value;

    releasePromise1.then(() => value = 1);
    releasePromise2.then(() => value = 2);

    const release1 = await releasePromise1;

    expect(value).toBe(1);

    release1();

    await releasePromise2;

    expect(value).toBe(2);
  });

  test('locked is true if the lock is locked', async () => {
    const lock = new Lock();

    const releasePromise1 = lock.acquire();
    const releasePromise2 = lock.acquire();

    expect(lock.locked).toBe(true);

    const release1 = await releasePromise1;
    expect(lock.locked).toBe(true);

    release1();
    expect(lock.locked).toBe(true);

    const release2 = await releasePromise2;
    expect(lock.locked).toBe(true);

    release2();
    expect(lock.locked).toBe(false);
  });

  test('triggers listener when locked', () => {
    const listenerMock = jest.fn();
    const lock = new Lock(listenerMock);

    lock.acquire();

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  test('triggers listener when unlocked', async () => {
    const listenerMock = jest.fn();
    const lock = new Lock(listenerMock);

    const release = await lock.acquire();
    release();

    expect(listenerMock).toHaveBeenCalledTimes(2);
  });

  test('triggers listener when owner is changed', async () => {
    const listenerMock = jest.fn();
    const lock = new Lock(listenerMock);

    const releasePromise1 = lock.acquire();
    const releasePromise2 = lock.acquire();

    const release1 = await releasePromise1;
    release1();

    const release2 = await releasePromise2;
    release2();

    expect(listenerMock).toHaveBeenCalledTimes(3);
  });
});
