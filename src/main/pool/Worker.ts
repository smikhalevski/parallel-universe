import { Awaitable } from '../shared-types';
import { isPromiseLike } from '../isPromiseLike';
import { AsyncQueue } from '../AsyncQueue';

/**
 * @internal
 */
export interface Job {
  __abortController: AbortController | null;
  __cb: (signal: AbortSignal) => Awaitable<unknown>;
  __resolve: (result: any) => void;
  __reject: (reason: any) => void;
}

/**
 * Worker picks jobs from the queue, invokes associated callbacks and fulfills the `Promise`.
 *
 * @internal
 */
export class Worker {
  public __terminated = false;
  public __terminationPromise;
  public __activeJob: Job | undefined;

  private __jobs: AsyncQueue<Job>;
  private __resolveTermination!: () => void;

  public constructor(jobs: AsyncQueue<Job>) {
    this.__jobs = jobs;
    this.__terminationPromise = new Promise<void>(resolve => {
      this.__resolveTermination = resolve;
    });
    this.__loop();
  }

  public __terminate(): void {
    this.__terminated = true;

    if (this.__activeJob) {
      this.__activeJob.__abortController?.abort();
    } else {
      this.__resolveTermination();
    }
  }

  private __loop = (): Awaitable<void> => {
    this.__activeJob = undefined;

    if (this.__terminated) {
      this.__resolveTermination();
      return;
    }

    return this.__jobs.takeAck().then(([job, ack]) => {
      if (this.__terminated) {
        return;
      }

      ack();

      const { __resolve, __reject } = (this.__activeJob = job);
      const abortController = (job.__abortController = new AbortController());

      let result;
      try {
        result = job.__cb(abortController.signal);
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
