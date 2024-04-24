import { AbortablePromise } from './AbortablePromise';
import { AbortableCallback } from './types';
import { AsyncQueue } from './AsyncQueue';
import { noop } from './utils';
import { Job, Worker } from './Worker';

/**
 * The callback execution pool that can execute limited number of callbacks in parallel while other submitted callbacks
 * wait in the queue.
 */
export class WorkPool {
  /**
   * The queue that holds submitted jobs.
   */
  private _jobQueue = new AsyncQueue<Job>();

  /**
   * Active workers and workers with pending termination.
   */
  private _workers: Worker[] = [];

  /**
   * Creates a new {@link WorkPool} instance that uses given number of workers.
   *
   * @param size The number of workers in the pool.
   */
  constructor(size = 1) {
    this.setSize(size);
  }

  /**
   * The number of active workers in the pool.
   */
  get size(): number {
    let size = 0;

    for (const worker of this._workers) {
      if (!worker.isTerminated) {
        ++size;
      }
    }
    return size;
  }

  /**
   * Changes the size of the pool by spawning or terminating workers. If the size of the pool is reduced, then
   * corresponding workers are terminated and if they were processing jobs, those jobs are instantly aborted.
   *
   * @param size The new size of the pool.
   * @param reason The reason that is used to reject pending job promises that are processed by terminated workers. Only
   * applicable if the pool is downsized.
   * @return The promise that is fulfilled when the number of workers matches the requested size: excessive workers were
   * deleted or additional workers were spawned.
   */
  setSize(size: number, reason?: any): Promise<void> {
    const { _workers } = this;

    const promises = [];

    // Terminate excessive workers
    for (let i = 0; i < _workers.length; ++i) {
      const worker = _workers[i];

      if (worker.isTerminated) {
        // Worker is terminated but job abortion is pending
        promises.push(worker.terminate(reason));
        continue;
      }
      if (--size >= 0) {
        continue;
      }

      // Remove worker from the pool after its termination is completed
      promises.push(
        worker.terminate(reason).then(() => {
          _workers.splice(_workers.indexOf(worker), 1);
        })
      );
    }

    // Spawn additional workers
    for (let i = 0; i < size; ++i) {
      _workers.push(new Worker(this._jobQueue));
    }

    return Promise.all(promises).then(noop);
  }

  /**
   * Submits a new callback that should be executed by the worker in the pool.
   *
   * @param cb The callback to invoke.
   * @template T The callback result.
   * @returns The promise that is fulfilled with the callback result.
   */
  submit<T>(cb: AbortableCallback<T>): AbortablePromise<T> {
    return new AbortablePromise((resolve, reject, signal) => {
      this._jobQueue.append({ cb, resolve, reject, signal });
    });
  }

  /**
   * Aborts all pending jobs and returns promise that is fulfilled when all workers are terminated.
   *
   * This operation preserves the size of the pool intact.
   *
   * @param reason The reason that is used to reject all pending job promises.
   * @return The promise that is fulfilled when all workers are terminated.
   */
  abort(reason?: any): Promise<void> {
    const size = this.size;
    this.setSize(0, reason);
    return this.setSize(size);
  }
}
