import {Pool} from '../../main';

describe('Pool', () => {

  let pool: Pool;

  beforeEach(() => {
    pool = new Pool(1);
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
});
