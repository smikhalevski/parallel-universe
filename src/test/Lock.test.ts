import { expect, test } from 'vitest';
import { Lock } from '../main/index.js';

test('the new lock is unlocked', () => {
  expect(new Lock().isLocked).toBe(false);
});

test('acquiring the lock returns a promise', async () => {
  await expect(new Lock().acquire()).resolves.toBeInstanceOf(Function);
});

test('provides the exclusive lock ownership', async () => {
  const lock = new Lock();

  const releasePromise1 = lock.acquire();
  const releasePromise2 = lock.acquire();

  let value;

  releasePromise1.then(() => {
    value = 111;
  });
  releasePromise2.then(() => {
    value = 222;
  });

  const release1 = await releasePromise1;

  expect(value).toBe(111);

  release1();

  await releasePromise2;

  expect(value).toBe(222);
});

test('locked is true if the lock is locked', async () => {
  const lock = new Lock();

  const releasePromise1 = lock.acquire();
  const releasePromise2 = lock.acquire();

  expect(lock.isLocked).toBe(true);

  const release1 = await releasePromise1;
  expect(lock.isLocked).toBe(true);

  release1();
  expect(lock.isLocked).toBe(true);

  const release2 = await releasePromise2;
  expect(lock.isLocked).toBe(true);

  release2();
  expect(lock.isLocked).toBe(false);
});
