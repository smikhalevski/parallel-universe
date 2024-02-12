import { AsyncQueue } from './AsyncQueue';

/**
 * The job that a worker can execute.
 */
export interface Job {
  /**
   * The callback that the worker must execute.
   *
   * @param signal The signal that is aborted when the job must be aborted.
   */
  callback: (signal: AbortSignal) => unknown;

  /**
   * The callback that receives the callback value.
   */
  resolve: (result: any) => void;

  /**
   * The callback that receives an error thrown by the callback.
   */
  reject: (reason: any) => void;
}

/**
 * The worker picks a job from the queue and invokes its callbacks to fulfill or reject the underlying promise.
 */
export class Worker {
  /**
   * The controller that aborts the active job if the worker is terminated. If `undefined` then there's no active job.
   */
  private _abortController?: AbortController;

  /**
   * The worker EOL promise, created if termination was requested during active job processing.
   */
  private _promise?: Promise<void>;

  /**
   * Resolves the EOL {@link _promise}.
   */
  private _notify?: () => void;

  /**
   * `true` if the worker won't consume any new jobs, or `false` otherwise.
   */
  get isTerminated(): boolean {
    return this._promise !== undefined;
  }

  /**
   * Creates a new {@link Worker} instance.
   *
   * @param jobQueue The queue from which the worker takes jobs.
   */
  constructor(jobQueue: AsyncQueue<Job>) {
    const next = (): void => {
      if (this.isTerminated) {
        this._notify!();
        return;
      }

      jobQueue.takeAck().then(([job, ack]) => {
        if (this.isTerminated) {
          return;
        }

        ack();

        const abortController = new AbortController();
        this._abortController = abortController;

        new Promise(resolve => {
          resolve(job.callback(abortController.signal));
        }).then(
          result => {
            this._abortController = undefined;
            job.resolve(result);
            next();
          },
          reason => {
            this._abortController = undefined;
            job.reject(reason);
            next();
          }
        );
      });
    };

    next();
  }

  /**
   * Terminates the worker and aborts the active job.
   *
   * @returns The promise that is resolved when an active job is completed and worker is terminated.
   */
  terminate(): Promise<void> {
    const { _promise, _abortController } = this;

    if (_promise) {
      return _promise;
    }
    if (_abortController) {
      return (this._promise = new Promise(resolve => {
        this._notify = resolve;
        _abortController.abort();
      }));
    } else {
      return (this._promise = Promise.resolve());
    }
  }
}
