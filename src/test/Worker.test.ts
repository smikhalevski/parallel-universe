import { beforeEach, expect, test, vi } from 'vitest';
import { AsyncQueue, delay } from '../main/index.js';
import { noop } from '../main/utils.js';
import { Job, Worker } from '../main/Worker.js';

let jobQueue: AsyncQueue<Job>;
let worker: Worker;
let jobAbortController: AbortController;
let jobPromise: Promise<void>;
let job: Job;

beforeEach(() => {
  jobQueue = new AsyncQueue();
  worker = new Worker(jobQueue);
  jobAbortController = new AbortController();

  job = {
    signal: jobAbortController.signal,
    cb: vi.fn(),
    resolve: noop,
    reject: noop,
  };

  jobPromise = new Promise(resolve => {
    job.resolve = vi.fn(resolve);
    job.reject = vi.fn(resolve);
  });
});

test('creates a blank worker', () => {
  expect(worker.isTerminated).toBe(false);
});

test('takes sync job from the queue and resolves', async () => {
  const cbMock = vi.fn(_signal => 111);

  job.cb = cbMock;

  jobQueue.append(job);

  await jobPromise;

  expect(jobQueue.size).toBe(0);
  expect(cbMock).toHaveBeenCalledTimes(1);
  expect(cbMock.mock.calls[0][0].aborted).toBe(false);
  expect(job.resolve).toHaveBeenCalledTimes(1);
  expect(job.resolve).toHaveBeenCalledWith(111);
  expect(job.reject).not.toHaveBeenCalled();
});

test('takes sync job from the queue and rejects', async () => {
  job.cb = vi.fn(() => {
    throw new Error('expected');
  });

  jobQueue.append(job);

  await jobPromise;

  expect(jobQueue.size).toBe(0);
  expect(job.cb).toHaveBeenCalledTimes(1);
  expect(job.resolve).not.toHaveBeenCalled();
  expect(job.reject).toHaveBeenCalledTimes(1);
  expect(job.reject).toHaveBeenCalledWith(new Error('expected'));
});

test('takes async job from the queue and resolves', async () => {
  const cbMock = vi.fn(_signal => Promise.resolve(111));

  job.cb = cbMock;

  jobQueue.append(job);

  await jobPromise;

  expect(cbMock).toHaveBeenCalledTimes(1);
  expect(cbMock.mock.calls[0][0].aborted).toBe(false);
  expect(job.resolve).toHaveBeenCalledTimes(1);
  expect(job.resolve).toHaveBeenCalledWith(111);
  expect(job.reject).not.toHaveBeenCalled();
});

test('takes async job from the queue and rejects', async () => {
  job.cb = vi.fn(() => Promise.reject(111));

  jobQueue.append(job);

  await jobPromise;

  expect(job.cb).toHaveBeenCalledTimes(1);
  expect(job.resolve).not.toHaveBeenCalled();
  expect(job.reject).toHaveBeenCalledTimes(1);
  expect(job.reject).toHaveBeenCalledWith(111);
});

test('takes next job after completion', async () => {
  const job2: Job = {
    signal: new AbortController().signal,
    cb: vi.fn(),
    resolve: vi.fn(),
    reject: vi.fn(),
  };

  const job2Promise = new Promise(resolve => {
    job2.resolve = vi.fn(resolve);
    job2.reject = vi.fn(resolve);
  });

  jobQueue.append(job);
  jobQueue.append(job2);

  await jobPromise;

  expect(job.cb).toHaveBeenCalledTimes(1);
  expect(job2.cb).not.toHaveBeenCalled();

  await job2Promise;

  expect(job.cb).toHaveBeenCalledTimes(1);
  expect(job2.cb).toHaveBeenCalledTimes(1);
});

test('takes next job after the preceding job has thrown error', async () => {
  job.cb = vi.fn(() => {
    throw new Error();
  });

  const job2: Job = {
    signal: new AbortController().signal,
    cb: vi.fn(),
    resolve: vi.fn(),
    reject: vi.fn(),
  };

  const job2Promise = new Promise(resolve => {
    job2.resolve = vi.fn(resolve);
    job2.reject = vi.fn(resolve);
  });

  jobQueue.append(job);
  jobQueue.append(job2);

  await jobPromise;
  await job2Promise;

  expect(job.cb).toHaveBeenCalledTimes(1);
  expect(job2.cb).toHaveBeenCalledTimes(1);
});

test('does not pick jobs after termination', async () => {
  const promise = worker.terminate(undefined);

  expect(worker.isTerminated).toBe(true);

  jobQueue.append(job);

  await promise;
  await delay(100);

  expect(job.cb).not.toHaveBeenCalled();
});

test('aborts the job signal when terminated', async () => {
  const cbMock = vi.fn(_signal => delay(100));

  job.cb = cbMock;

  jobQueue.append(job);

  await delay(10);

  await worker.terminate(111);

  expect(cbMock.mock.calls[0][0].aborted).toBe(true);
  expect(cbMock.mock.calls[0][0].reason).toBe(111);
});

// test('does not abort the signal of the completed job', async () => {
//   const cbMock = vi.fn(signal => Promise.resolve());
//
//   job.cb = cbMock;
//
//   jobQueue.append(job);
//
//   await jobPromise;
//
//   await worker.terminate(undefined);
//
//   expect(cbMock.mock.calls[0][0].aborted).toBe(false);
// });

test('resolves the termination promise when idle', async () => {
  await expect(worker.terminate(undefined)).resolves.toBe(undefined);
});

test('resolves the termination promise after an async job is completed', async () => {
  job.cb = vi.fn(() => delay(100));

  jobQueue.append(job);

  await delay(10);

  await expect(worker.terminate(undefined)).resolves.toBe(undefined);

  expect(job.reject).toHaveBeenCalledTimes(2);
});

test('returns the same promise', async () => {
  expect(worker.terminate(undefined)).toBe(worker.terminate(undefined));
});
