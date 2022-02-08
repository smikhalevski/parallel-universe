import {Awaitable} from '../shared-types';
import {AsyncQueue} from '../AsyncQueue';
import {noop} from '../utils';
import {PoolJob, PoolWorker} from './PoolWorker';

/**
 * The worker pool that can execute limited number of jobs (callbacks) in parallel while other submitted jobs wait in
 * the queue.
 */
export class Pool {

  private _jobs = new AsyncQueue<PoolJob>();
  private _workers: PoolWorker[] = [];

  /**
   * Creates a new {@link Pool} instance that uses given number of workers.
   *
   * @param [size = 1] The number of workers in the pool.
   */
  public constructor(size = 1) {
    this.resize(size);
  }

  /**
   * The number of non-terminated workers is the pool.
   */
  public get size() {
    let size = 0;
    for (const worker of this._workers) {
      if (!worker.__terminated) {
        ++size;
      }
    }
    return size;
  }

  /**
   * Submits a new callback that should be executed by the worker in the pool.
   *
   * @param cb The callback to invoke.
   * @returns The `Promise` that is fulfilled with the `cb` result.
   */
  public submit<T>(cb: (signal: AbortSignal) => Awaitable<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this._jobs.add({
        __cb: cb,
        __resolve: resolve,
        __reject: reject,
      });
    });
  }

  /**
   * Changes the size of the pool by spawning or terminating workers. When worker is terminated while processing ann
   * async task, its `signal` is aborted.
   *
   * @param size The new number of workers in the pool.
   * @returns The `Promise` that resolves when the pool would reach the requested size: when excessive workers were
   *     terminated and insufficient workers were spawned.
   */
  public resize(size: number): Promise<void> {
    const {_workers} = this;

    // Termination promises
    const promises: Promise<void>[] = [];

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
        promises.push(worker.__promise);
      } else {
        _workers.splice(i--, 1);
      }
    }

    // Spawn workers
    for (let i = 0; i < size; ++i) {
      _workers.push(new PoolWorker(this._jobs));
    }

    return Promise.all(promises).then(noop);
  }
}
