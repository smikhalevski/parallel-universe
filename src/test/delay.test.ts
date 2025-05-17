import { expect, test, vi } from 'vitest';
import { delay } from '../main/index.js';

vi.useFakeTimers();

test('resolves after a timeout passes', async () => {
  const done = vi.fn();

  delay(200).then(done);

  vi.advanceTimersByTime(100);
  await Promise.resolve();

  expect(done).not.toHaveBeenCalled();

  vi.advanceTimersByTime(100);
  await Promise.resolve();

  expect(done).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(500);
  await Promise.resolve();

  expect(done).toHaveBeenCalledTimes(1);
});

test('resolves with undefined', async () => {
  const promise = delay(200);

  vi.runAllTimers();

  await expect(promise).resolves.toBeUndefined();
});

test('resolves with a value', async () => {
  const promise = delay(200, 'aaa');

  vi.runAllTimers();

  await expect(promise).resolves.toBe('aaa');
});

test('aborts the delay', async () => {
  const promise = delay(200);

  promise.abort();

  const expectPromise = expect(promise).rejects.toBeInstanceOf(DOMException);

  await vi.runAllTimersAsync();

  await expectPromise;
});
