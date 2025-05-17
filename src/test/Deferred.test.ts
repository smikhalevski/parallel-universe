import { expect, test } from 'vitest';
import { Deferred } from '../main/index.js';

test('creates an instance of deferred', async () => {
  const promise = new Deferred();

  promise.resolve(111);

  expect(promise).toBeInstanceOf(Promise);
  expect(promise).toBeInstanceOf(Deferred);
  await expect(promise).resolves.toBe(111);
});

test('resolves the promise', async () => {
  const promise = new Deferred();

  promise.resolve(111);

  await expect(promise).resolves.toBe(111);
});
