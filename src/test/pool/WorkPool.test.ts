import { WorkPool, sleep } from '../../main';
import { noop } from '../../main/utils';

describe('WorkPool', () => {
  let pool: WorkPool;

  beforeEach(() => {
    pool = new WorkPool(1);
  });

  test('submit returns a Promise', () => {
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

  test('resize returns a Promise', async () => {
    expect(pool.resize(2)).toBeInstanceOf(Promise);
  });

  test('spawn additional workers', async () => {
    pool.resize(2);

    const cbMock1 = jest.fn();
    const cbMock2 = jest.fn();

    pool.submit(cbMock1);
    await pool.submit(cbMock2);

    expect(cbMock1).toHaveBeenCalledTimes(1);
    expect(cbMock1).toHaveBeenCalledTimes(1);
  });

  test('terminates excessive idle workers', async () => {
    pool.resize(20);
    pool.resize(1);

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

  test('terminates excessive workers with pending jobs', async () => {
    const resolveMock = jest.fn();

    const cbMock1 = jest.fn(() => sleep(50).then(() => resolveMock(111)));
    const cbMock2 = jest.fn(() => sleep(50).then(() => resolveMock(222)));

    pool.resize(2);

    pool.submit(cbMock1);
    pool.submit(cbMock2);

    await Promise.resolve().then(noop).then(noop).then(noop).then(noop);

    await pool.resize(1);

    expect(cbMock1).toHaveBeenCalledTimes(1);
    expect(cbMock2).toHaveBeenCalledTimes(1);

    expect(resolveMock).toHaveBeenCalledTimes(2);
    expect(resolveMock).toHaveBeenNthCalledWith(1, 111);
    expect(resolveMock).toHaveBeenNthCalledWith(2, 222);
  });
});
