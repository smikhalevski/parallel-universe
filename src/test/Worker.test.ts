import { delay, AsyncQueue } from '../main';
import { Job, Worker } from '../main/Worker';
import { noop } from '../main/utils';

describe('Worker', () => {
  let queue: AsyncQueue<Job>;
  let worker: Worker;
  let job: Job;
  let jobPromise: Promise<void>;

  beforeEach(() => {
    queue = new AsyncQueue();
    worker = new Worker(queue);

    job = {
      callback: jest.fn(),
      resolve: noop,
      reject: noop,
    };

    jobPromise = new Promise(resolve => {
      job.resolve = jest.fn(resolve);
      job.reject = jest.fn(resolve);
    });
  });

  test('creates a blank worker', () => {
    expect(worker.isTerminated).toBe(false);
  });

  test('takes sync job from the queue and resolves', async () => {
    const cbMock = jest.fn(signal => 111);

    job.callback = cbMock;

    queue.append(job);

    await jobPromise;

    expect(queue.size).toBe(0);
    expect(worker['_abortController']).toBe(undefined);

    expect(cbMock).toHaveBeenCalledTimes(1);
    expect(cbMock.mock.calls[0][0].aborted).toBe(false);
    expect(job.resolve).toHaveBeenCalledTimes(1);
    expect(job.resolve).toHaveBeenCalledWith(111);
    expect(job.reject).not.toHaveBeenCalled();
  });

  test('takes sync job from the queue and rejects', async () => {
    job.callback = jest.fn(() => {
      throw new Error('expected');
    });

    queue.append(job);

    await jobPromise;

    expect(queue.size).toBe(0);
    expect(worker['_abortController']).toBe(undefined);

    expect(job.callback).toHaveBeenCalledTimes(1);
    expect(job.resolve).not.toHaveBeenCalled();
    expect(job.reject).toHaveBeenCalledTimes(1);
    expect(job.reject).toHaveBeenCalledWith(new Error('expected'));
  });

  test('takes async job from the queue and resolves', async () => {
    const cbMock = jest.fn(signal => Promise.resolve(111));

    job.callback = cbMock;

    queue.append(job);

    await jobPromise;

    expect(worker['_abortController']).toBe(undefined);
    expect(cbMock).toHaveBeenCalledTimes(1);
    expect(cbMock.mock.calls[0][0].aborted).toBe(false);
    expect(job.resolve).toHaveBeenCalledTimes(1);
    expect(job.resolve).toHaveBeenCalledWith(111);
    expect(job.reject).not.toHaveBeenCalled();
  });

  test('takes async job from the queue and rejects', async () => {
    job.callback = jest.fn(() => Promise.reject(111));

    queue.append(job);

    await jobPromise;

    expect(worker['_abortController']).toBe(undefined);
    expect(job.callback).toHaveBeenCalledTimes(1);
    expect(job.resolve).not.toHaveBeenCalled();
    expect(job.reject).toHaveBeenCalledTimes(1);
    expect(job.reject).toHaveBeenCalledWith(111);
  });

  test('takes next job after completion', async () => {
    const job2: Job = {
      callback: jest.fn(),
      resolve: jest.fn(),
      reject: jest.fn(),
    };

    const job2Promise = new Promise(resolve => {
      job2.resolve = jest.fn(resolve);
      job2.reject = jest.fn(resolve);
    });

    queue.append(job);
    queue.append(job2);

    await jobPromise;

    expect(job.callback).toHaveBeenCalledTimes(1);
    expect(job2.callback).not.toHaveBeenCalled();

    await job2Promise;

    expect(job.callback).toHaveBeenCalledTimes(1);
    expect(job2.callback).toHaveBeenCalledTimes(1);

    expect(worker['_abortController']).toBe(undefined);
  });

  test('takes next job after the preceding job has thrown error', async () => {
    job.callback = jest.fn(() => {
      throw new Error();
    });

    const job2: Job = {
      callback: jest.fn(),
      resolve: jest.fn(),
      reject: jest.fn(),
    };

    const job2Promise = new Promise(resolve => {
      job2.resolve = jest.fn(resolve);
      job2.reject = jest.fn(resolve);
    });

    queue.append(job);
    queue.append(job2);

    await jobPromise;
    await job2Promise;

    expect(job.callback).toHaveBeenCalledTimes(1);
    expect(job2.callback).toHaveBeenCalledTimes(1);
  });

  test('does not pick jobs after termination', async () => {
    const promise = worker.terminate();

    expect(worker.isTerminated).toBe(true);

    queue.append(job);

    await promise;
    await delay(100);

    expect(job.callback).not.toHaveBeenCalled();
  });

  test('aborts the job signal when terminated', async () => {
    let jobSignal: AbortSignal | undefined;

    job.callback = jest.fn(signal => {
      jobSignal = signal;
      return delay(100);
    });

    queue.append(job);

    await delay(10);

    await worker.terminate();

    expect(jobSignal!.aborted).toBe(true);
  });

  test('does not abort the signal of the completed job', async () => {
    let jobSignal: AbortSignal | undefined;

    job.callback = jest.fn(signal => {
      jobSignal = signal;
      return Promise.resolve();
    });

    queue.append(job);

    await jobPromise;

    await worker.terminate();

    expect(jobSignal!.aborted).toBe(false);
  });

  test('resolves the termination promise when idle', async () => {
    await expect(worker.terminate()).resolves.toBe(undefined);
  });

  test('resolves the termination promise after an async job is completed', async () => {
    job.callback = jest.fn(() => delay(100));

    queue.append(job);

    await delay(10);

    await expect(worker.terminate()).resolves.toBe(undefined);

    expect(job.resolve).toHaveBeenCalledTimes(1);
  });

  test('returns the same promise', async () => {
    expect(worker.terminate()).toBe(worker.terminate());
  });
});
