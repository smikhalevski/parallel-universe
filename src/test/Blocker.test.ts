import { expect, test } from 'vitest';
import { Blocker } from '../main/index.js';

test('unblocked by default', () => {
  expect(new Blocker().isBlocked).toBe(false);
});

test('blocks', () => {
  const blocker = new Blocker();

  expect(blocker.block()).toBeInstanceOf(Promise);
  expect(blocker.isBlocked).toBe(true);
});

test('sequential blocks return the same promise', () => {
  const blocker = new Blocker();

  expect(blocker.block()).toBe(blocker.block());
});

test('unblocks with result', async () => {
  const blocker = new Blocker<number>();

  const promise = blocker.block();

  blocker.unblock(111);

  await expect(promise).resolves.toBe(111);
  expect(blocker.isBlocked).toBe(false);
});

test('no-op multiple unblocks', () => {
  const blocker = new Blocker();

  blocker.block();

  blocker.unblock();
  blocker.unblock();

  expect(blocker.isBlocked).toBe(false);
});
