import { AsyncQueue } from './AsyncQueue.js';
import { noop, withSignal } from './utils.js';

/**
 * The job that a worker can execute.
 */
export interface Job {
  /**
   * The signal that the job was aborted by the consumer.
   */
  signal: AbortSignal;

  /**
   * The callback that the worker must execute.
   *
   * @param signal The signal that is aborted when the job must be aborted.
   */
  cb(signal: AbortSignal): unknown;

  /**
   * The callback that receives the fulfillment value.
   */
  resolve(value: any): void;

  /**
   * The callback that receives an error thrown by the {@link run callback}.
   */
  reject(reason: any): void;
}

/**
 * The worker picks a job from the queue and invokes its callbacks to fulfill or reject the underlying promise.
 */
export class Worker {
  /**
   * `true` if the worker won't consume any new jobs, or `false` otherwise.
   */
  isTerminated = false;

  /**
   * The controller that aborts the most recent job.
   */
  declare private _abortController: AbortController;

  /**
   * The promise that resolves when the most recent job is settled.
   */
  declare private _promise: Promise<void>;

  /**
   * Creates a new {@link Worker} instance.
   *
   * @param jobQueue The queue from which the worker takes jobs.
   */
  constructor(jobQueue: AsyncQueue<Job>) {
    const next = () => {
      const abortController = new AbortController();
      this._abortController = abortController;

      const signal = abortController.signal;

      this._promise = jobQueue
        .takeAck()
        .withSignal(signal)
        .then(([job, ack]) => {
          if (signal.aborted || job.signal.aborted) {
            ack(false);
            return;
          }

          ack(true);

          signal.addEventListener('abort', () => {
            job.reject(signal.reason);
          });

          job.signal.addEventListener('abort', () => {
            abortController.abort(job.signal.reason);
          });

          return new Promise(resolve => {
            resolve(withSignal((0, job.cb)(signal), signal));
          }).then(job.resolve, job.reject);
        }, noop)
        .then(() => {
          if (!this.isTerminated) {
            next();
          }
        });
    };

    next();
  }

  terminate(reason: any): Promise<void> {
    this._abortController.abort(reason);
    this.isTerminated = true;
    return this._promise;
  }
}
