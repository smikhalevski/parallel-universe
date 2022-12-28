import { AsyncQueue, sleep } from '../../main';
import { Job, Worker } from '../../main/pool/Worker';
import { noop } from '../../main/utils';

describe('Worker', () => {
  let queue: AsyncQueue<Job>;
  let worker: Worker;
  let job: Job;

  beforeEach(() => {
    queue = new AsyncQueue();
    worker = new Worker(queue);
    job = {
      abortController: null,
      callback: jest.fn(),
      resolve: jest.fn(),
      reject: jest.fn(),
    };
  });

  test('creates a blank worker', () => {
    expect(worker.terminated).toBe(false);
    expect(worker.activeJob).toBe(null);
    expect(worker.terminationPromise).toBeInstanceOf(Promise);
  });

  test('takes jobs from the queue and resolves sync', async () => {
    const result = 111;
    const cbMock = (job.callback = jest.fn(abortController => result));

    queue.add(job);

    await Promise.resolve().then(noop);

    expect(worker.activeJob).toBe(null);
    expect(cbMock).toHaveBeenCalledTimes(1);
    expect(cbMock.mock.calls[0][0].aborted).toBe(false);
    expect(job.resolve).toHaveBeenCalledTimes(1);
    expect(job.resolve).toHaveBeenCalledWith(111);
    expect(job.reject).not.toHaveBeenCalled();
  });

  test('takes jobs from the queue and rejects sync', async () => {
    const error = new Error();
    const cbMock = (job.callback = jest.fn(abortController => {
      throw error;
    }));

    queue.add(job);

    await Promise.resolve().then(noop);

    expect(worker.activeJob).toBe(null);
    expect(cbMock).toHaveBeenCalledTimes(1);
    expect(cbMock.mock.calls[0][0].aborted).toBe(false);
    expect(job.resolve).not.toHaveBeenCalled();
    expect(job.reject).toHaveBeenCalledTimes(1);
    expect(job.reject).toHaveBeenCalledWith(error);
  });

  test('takes jobs from the queue and resolves async', async () => {
    const promise = Promise.resolve(111);
    const cbMock = (job.callback = jest.fn(abortController => promise));

    queue.add(job);

    await Promise.resolve().then(noop);

    expect(worker.activeJob).toBe(job);
    expect(cbMock).toHaveBeenCalledTimes(1);
    expect(cbMock.mock.calls[0][0].aborted).toBe(false);
    expect(job.resolve).not.toHaveBeenCalled();
    expect(job.reject).not.toHaveBeenCalled();

    await promise;

    expect(job.resolve).toHaveBeenCalledTimes(1);
    expect(job.resolve).toHaveBeenCalledWith(111);
    expect(job.reject).not.toHaveBeenCalled();
  });

  test('takes jobs from the queue and rejects async', async () => {
    job.callback = jest.fn(() => Promise.reject(111));

    queue.add(job);

    await sleep(0);

    expect(job.callback).toHaveBeenCalledTimes(1);
    expect(job.resolve).not.toHaveBeenCalled();
    expect(job.reject).toHaveBeenCalledTimes(1);
    expect(job.reject).toHaveBeenCalledWith(111);
  });

  test('takes next job after completion', async () => {
    job.callback = jest.fn(() => Promise.resolve());

    const job2: Job = {
      abortController: null,
      callback: jest.fn(() => Promise.resolve()),
      resolve: jest.fn(),
      reject: jest.fn(),
    };

    queue.add(job);
    queue.add(job2);

    await Promise.resolve().then(noop);

    expect(worker.activeJob).toBe(job);

    // Resolve job and take job2
    await Promise.resolve().then(noop).then(noop).then(noop);

    expect(worker.activeJob).toBe(job2);
  });

  test('takes next job after job that thrown error', async () => {
    job.callback = jest.fn(() => {
      throw new Error();
    });

    const job2: Job = {
      abortController: null,
      callback: jest.fn(),
      resolve: jest.fn(),
      reject: jest.fn(),
    };

    queue.add(job);
    queue.add(job2);

    await sleep(0);

    expect(job2.callback).toHaveBeenCalledTimes(1);
  });

  test('does not pick jobs after termination', async () => {
    worker.terminate();
    queue.add(job);

    expect(worker.terminated).toBe(true);

    await sleep(0);

    expect(job.callback).not.toHaveBeenCalled();
  });

  test('aborts the job signal when terminated', async () => {
    let jobSignal: AbortSignal | undefined;

    job.callback = jest.fn(async signal => {
      await Promise.resolve();
      jobSignal = signal;
    });

    queue.add(job);

    await Promise.resolve().then(noop).then(noop);

    worker.terminate();

    expect(jobSignal?.aborted).toBe(true);
  });

  test('does not abort the signal of the completed job', async () => {
    let jobSignal: AbortSignal | undefined;

    job.callback = jest.fn(async signal => {
      await Promise.resolve();
      jobSignal = signal;
    });

    queue.add(job);

    await sleep(0);

    worker.terminate();

    expect(jobSignal?.aborted).toBe(false);
  });

  test('does not abort the sync job', async () => {
    let jobSignal: AbortSignal | undefined;

    job.callback = jest.fn(signal => {
      jobSignal = signal;
    });

    queue.add(job);

    await Promise.resolve().then(noop);

    worker.terminate();

    expect(jobSignal?.aborted).toBe(false);

    await Promise.resolve().then(noop);

    expect(jobSignal?.aborted).toBe(false);
  });

  test('resolves the termination promise when idle', async () => {
    worker.terminate();

    await expect(worker.terminationPromise).resolves.toBeUndefined();
  });

  test('resolves the termination promise after an async job is completed', async () => {
    job.callback = jest.fn(() => Promise.resolve());

    queue.add(job);

    await Promise.resolve().then(noop);

    worker.terminate();

    await expect(worker.terminationPromise).resolves.toBeUndefined();
  });
});
