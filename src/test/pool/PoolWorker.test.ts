import {AsyncQueue} from '../../main';
import {PoolJob, PoolWorker} from '../../main/pool/PoolWorker';
import {noop} from '../../main/utils';

describe('PoolWorker', () => {

  let queue: AsyncQueue<PoolJob>;
  let worker: PoolWorker;
  let job: PoolJob;

  beforeEach(() => {
    queue = new AsyncQueue();
    worker = new PoolWorker(queue);
    job = {
      __cb: jest.fn(),
      __resolve: jest.fn(),
      __reject: jest.fn(),
    };
  });

  test('creates a blank worker', () => {
    expect(worker.__terminated).toBe(false);
    expect(worker.__activeJob).toBeUndefined();
    expect(worker.__promise).toBeInstanceOf(Promise);
  });

  test('takes jobs from the queue and resolves sync', async () => {
    const result = 111;
    job.__cb = jest.fn(() => result);

    queue.add(job);

    // The job is taken on the next tick
    await Promise.resolve();

    expect(worker.__activeJob).toBeUndefined();
    expect(job.__cb).toHaveBeenCalledTimes(1);
    expect(job.__cb).toHaveBeenCalledWith(new AbortController().signal);
    expect(job.__resolve).toHaveBeenCalledTimes(1);
    expect(job.__resolve).toHaveBeenCalledWith(111);
    expect(job.__reject).not.toHaveBeenCalled();
  });

  test('takes jobs from the queue and rejects sync', async () => {
    const error = new Error();
    job.__cb = jest.fn(() => {
      throw error;
    });

    queue.add(job);

    // The job is taken on the next tick
    await Promise.resolve();

    expect(worker.__activeJob).toBeUndefined();
    expect(job.__cb).toHaveBeenCalledTimes(1);
    expect(job.__cb).toHaveBeenCalledWith(new AbortController().signal);
    expect(job.__resolve).not.toHaveBeenCalled();
    expect(job.__reject).toHaveBeenCalledTimes(1);
    expect(job.__reject).toHaveBeenCalledWith(error);
  });

  test('takes jobs from the queue and resolves async', async () => {
    const promise = Promise.resolve(111);
    job.__cb = jest.fn(() => promise);

    queue.add(job);

    // The job is taken on the next tick
    await Promise.resolve();

    expect(worker.__activeJob).toBe(job);
    expect(job.__cb).toHaveBeenCalledTimes(1);
    expect(job.__cb).toHaveBeenCalledWith(new AbortController().signal);
    expect(job.__resolve).not.toHaveBeenCalled();
    expect(job.__reject).not.toHaveBeenCalled();

    await promise;

    expect(job.__resolve).toHaveBeenCalledTimes(1);
    expect(job.__resolve).toHaveBeenCalledWith(111);
    expect(job.__reject).not.toHaveBeenCalled();
  });

  test('takes jobs from the queue and rejects async', async () => {
    const promise = Promise.reject(111);
    job.__cb = jest.fn(() => promise);

    queue.add(job);

    await promise.catch(noop);

    expect(job.__cb).toHaveBeenCalledTimes(1);
    expect(job.__resolve).not.toHaveBeenCalled();
    expect(job.__reject).toHaveBeenCalledTimes(1);
    expect(job.__reject).toHaveBeenCalledWith(111);
  });

  test('takes next job after completion', async () => {
    job.__cb = jest.fn(() => Promise.resolve());

    const job2 = {
      __cb: jest.fn(() => Promise.resolve()),
      __resolve: jest.fn(),
      __reject: jest.fn(),
    };

    queue.add(job);
    queue.add(job2);

    await Promise.resolve();

    expect(worker.__activeJob).toBe(job);

    // Resolve job and take job2
    await Promise.resolve().then(noop).then(noop);

    expect(worker.__activeJob).toBe(job2);
  });

  test('takes next job after thrown error', async () => {
    job.__cb = jest.fn(() => {
      throw new Error();
    });

    const job2 = {
      __cb: jest.fn(),
      __resolve: jest.fn(),
      __reject: jest.fn(),
    };

    queue.add(job);
    queue.add(job2);

    // Take and resolve job, and take job2
    await Promise.resolve().then(noop).then(noop).then(noop);

    expect(job2.__cb).toHaveBeenCalledTimes(1);
  });
});
