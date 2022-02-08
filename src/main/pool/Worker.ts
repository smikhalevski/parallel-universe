import {Awaitable} from '../shared-types';
import {isPromiseLike} from '../isPromiseLike';
import {AsyncQueue} from '../AsyncQueue';

/**
 * The job processed by a {@link Worker}.
 *
 * @internal
 */
export interface Job {

  /**
   * The abort controller that aborts the callback execution.
   */
  __ac?: AbortController;
  __cb: (signal: AbortSignal) => Awaitable<unknown>;
  __resolve: (result: unknown) => void;
  __reject: (reason: unknown) => void;
}

/**
 * Worker consumes jobs from the job provider and executes them.
 *
 * @internal
 */
export class Worker {

  public __terminated = false;
  public __promise;
  public __job: Job | undefined;

  private __jobs;
  private __resolve!: () => void;

  public constructor(jobs: AsyncQueue<Job>) {
    this.__jobs = jobs;
    this.__promise = new Promise<void>((resolve) => {
      this.__resolve = resolve;
    });
  }

  public __terminate(): void {
    this.__terminated = true;

    if (this.__job) {
      this.__job.__ac?.abort();
    } else {
      this.__resolve();
    }
  }

  public __loop = (): Awaitable<void> => {
    this.__job = undefined;

    if (this.__terminated) {
      this.__resolve();
      return;
    }

    return this.__jobs.takeAck().then((ack) => {

      if (this.__terminated) {
        return;
      }

      const job = this.__job = ack();
      const {__resolve, __reject} = job;
      const ac = job.__ac = new AbortController();

      let result;
      try {
        result = job.__cb(ac.signal);
      } catch (error) {
        __reject(error);
        return this.__loop();
      }

      if (isPromiseLike(result)) {
        return result.then(__resolve, __reject).then(this.__loop);
      } else {
        __resolve(result);
      }

      return this.__loop();
    });
  };
}
