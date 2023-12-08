import { AbortableCallback } from './types';
import { Topic } from './Topic';
import { noop } from './utils';
import { Job, Worker } from './Worker';

/**
 * The callback execution pool that can execute limited number of callbacks in parallel while other submitted callbacks
 * wait in the topic.
 */
export class WorkPool {
  /**
   * The number of active workers in the pool.
   */
  private _size!: number;

  /**
   * The topic that holds submitted jobs.
   */
  private _topic = new Topic<Job>();

  /**
   * Active workers and workers with pending termination.
   */
  private _workers: Worker[] = [];

  /**
   * Creates a new {@link WorkPool} instance that uses given number of workers.
   *
   * @param [size = 1] The number of workers in the pool.
   */
  constructor(size = 1) {
    this.resize(size);
  }

  /**
   * The number of active workers in the pool.
   */
  get size(): number {
    return this._size;
  }

  /**
   * Submits a new callback that should be executed by the worker in the pool.
   *
   * @param cb The callback to invoke.
   * @template T The callback result.
   * @returns The promise that is fulfilled with the `cb` result.
   */
  submit<T>(cb: AbortableCallback<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this._topic.add({ callback: cb, resolve, reject });
    });
  }

  /**
   * Changes the size of the pool by spawning or terminating workers. When worker is terminated while processing an
   * async task, its `signal` is aborted.
   *
   * @param size The non-negative integer number of workers in the pool.
   * @returns The promise that is fulfilled when the pool reaches the requested size: excessive workers were terminated
   * or additional workers were spawned.
   */
  resize(size: number): Promise<void> {
    const { _workers } = this;

    this._size = size;

    const promises: Promise<void>[] = [];

    // Terminate excessive workers
    for (let i = 0; i < _workers.length; ++i) {
      const worker = _workers[i];

      if (worker.isTerminated) {
        promises.push(worker.terminate());
        continue;
      }
      if (--size >= 0) {
        continue;
      }

      // Remove worker from the pool after its termination is completed
      promises.push(
        worker.terminate().then(() => {
          _workers.splice(_workers.indexOf(worker), 1);
        })
      );
    }

    // Spawn additional workers
    for (let i = 0; i < size; ++i) {
      _workers.push(new Worker(this._topic));
    }

    return Promise.all(promises).then(noop);
  }
}
