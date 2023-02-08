import { raceTimeout } from '../main';

jest.useFakeTimers();

describe('timeout', () => {
  test('resolves if a promise if fulfilled before a timeout runs out', async () => {
    await expect(raceTimeout(() => Promise.resolve(111), 1)).resolves.toEqual(111);
  });

  test('rejects if a timeout runs out', async () => {
    const promise = raceTimeout(() => new Promise(() => undefined), 100);

    jest.advanceTimersByTime(100);

    await expect(promise).rejects.toEqual(new Error('Timeout'));
  });

  test('rejects if a promise is rejected runs out', async () => {
    await expect(raceTimeout(() => Promise.reject(111), 1)).rejects.toBe(111);
  });
});
