import { Awaitable } from '../shared-types';
import { AsyncQueue } from '../AsyncQueue';
import { noop } from '../utils';
import { Job, Worker } from './Worker';

/**
 * The callback execution pool that can execute limited number of callbacks in parallel while other submitted callbacks
 * wait in the queue.
 */
export class WorkPool {
  /**
   * The number of non-terminated workers is the pool. Use {@linkcode resize} to change the pool size.
   */
  size = 1;

  private _jobs = new AsyncQueue<Job>();
  private _workers: Worker[] = [];

  /**
   * Creates a new {@linkcode WorkPool} instance that uses given number of workers.
   *
   * @param [size = 0] The number of workers in the pool.
   */
  constructor(size?: number) {
    void this.resize(size || 0);
  }

  /**
   * Submits a new callback that should be executed by the worker in the pool.
   *
   * @param cb The callback to invoke.
   * @template T The callback result.
   * @returns The promise that is fulfilled with the `cb` result.
   */
  submit<T>(cb: (signal: AbortSignal) => Awaitable<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this._jobs.add({
        __abortController: null,
        __callback: cb,
        __resolve: resolve,
        __reject: reject,
      });
    });
  }

  /**
   * Changes the size of the pool by spawning or terminating workers. When worker is terminated while processing an
   * async task, its `signal` is aborted.
   *
   * @param size The non-negative integer number of workers in the pool.
   * @returns The promise that is fulfilled when the pool would reach the requested size: when excessive workers were
   * terminated or additional workers were spawned.
   */
  resize(size: number): Promise<void> {
    const { _workers } = this;

    this.size = Math.max(size | 0, 0);

    const terminationPromises: Promise<void>[] = [];

    // Terminate excessive workers
    for (let i = 0; i < _workers.length; ++i) {
      const worker = _workers[i];

      if (!worker.__terminated) {
        --size;

        if (size >= 0) {
          continue;
        }
        worker.__terminate();
      }

      if (worker.__activeJob) {
        terminationPromises.push(worker.__terminationPromise);
      } else {
        _workers.splice(i--, 1);
      }
    }

    // Spawn additional workers
    for (let i = 0; i < size; ++i) {
      _workers.push(new Worker(this._jobs));
    }

    return terminationPromises.length ? Promise.all(terminationPromises).then(noop) : Promise.resolve();
  }
}
