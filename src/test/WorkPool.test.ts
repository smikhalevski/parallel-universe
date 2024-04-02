import { delay, WorkPool } from '../main';

describe('WorkPool', () => {
  let pool: WorkPool;

  beforeEach(() => {
    pool = new WorkPool(1);
  });

  test('creates a pool with a single worker', () => {
    expect(new WorkPool().size).toBe(1);
  });

  test('submit returns a promise', () => {
    expect(pool.submit(() => 111)).toBeInstanceOf(Promise);
  });

  test('resolves with the returned value', async () => {
    await expect(pool.submit(() => 111)).resolves.toBe(111);
  });

  test('executes limited number of jobs in parallel', async () => {
    const cbMock1 = jest.fn();
    const cbMock2 = jest.fn();

    const promise1 = pool.submit(cbMock1);
    const promise2 = pool.submit(cbMock2);

    await promise1;

    expect(cbMock1).toHaveBeenCalledTimes(1);
    expect(cbMock2).not.toHaveBeenCalled();

    await promise2;

    expect(cbMock1).toHaveBeenCalledTimes(1);
    expect(cbMock2).toHaveBeenCalledTimes(1);
  });

  test('setSize returns a promise', async () => {
    expect(pool.setSize(2)).toBeInstanceOf(Promise);
  });

  test('spawns additional workers', async () => {
    pool.setSize(2);

    const cbMock1 = jest.fn();
    const cbMock2 = jest.fn();

    pool.submit(cbMock1);

    await pool.submit(cbMock2);

    expect(pool['_workers'].length).toBe(2);
    expect(cbMock1).toHaveBeenCalledTimes(1);
    expect(cbMock1).toHaveBeenCalledTimes(1);
  });

  test('terminates excessive idle workers', async () => {
    pool.setSize(20);
    pool.setSize(1);

    const cbMock1 = jest.fn();
    const cbMock2 = jest.fn();

    const promise1 = pool.submit(cbMock1);
    const promise2 = pool.submit(cbMock2);

    await promise1;

    expect(pool['_workers'].length).toBe(1);
    expect(cbMock1).toHaveBeenCalledTimes(1);
    expect(cbMock2).not.toHaveBeenCalled();

    await promise2;

    expect(cbMock1).toHaveBeenCalledTimes(1);
    expect(cbMock2).toHaveBeenCalledTimes(1);
  });

  test('terminates excessive workers with pending jobs', async () => {
    const cbMock1 = jest.fn(() => delay(20, 111));
    const cbMock2 = jest.fn(() => delay(20, 222));

    pool.setSize(2);

    const promise1 = pool.submit(cbMock1);
    const promise2 = pool.submit(cbMock2);

    await delay(10);

    await pool.setSize(1);

    expect(pool['_workers'].length).toBe(1);
    expect(cbMock1).toHaveBeenCalledTimes(1);
    expect(cbMock2).toHaveBeenCalledTimes(1);

    await expect(promise2).rejects.toEqual(new DOMException('This operation was aborted', 'AbortError'));
    await expect(promise1).resolves.toBe(111);
  });
});
