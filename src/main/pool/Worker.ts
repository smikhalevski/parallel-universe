import { Awaitable } from '../shared-types';
import { isPromiseLike } from '../isPromiseLike';
import { AsyncQueue } from '../AsyncQueue';

/**
 * @internal
 */
export interface Job {
  __abortController: AbortController | null;
  __callback: (signal: AbortSignal) => Awaitable<unknown>;
  __resolve: (result: any) => void;
  __reject: (reason: any) => void;
}

/**
 * Worker picks jobs from the queue, invokes associated callbacks and fulfills the promise.
 *
 * @internal
 */
export class Worker {
  __terminated = false;
  __terminationPromise;
  __activeJob: Job | undefined;

  private __jobs: AsyncQueue<Job>;
  private __resolveTermination!: () => void;

  constructor(jobs: AsyncQueue<Job>) {
    this.__jobs = jobs;
    this.__terminationPromise = new Promise<void>(resolve => {
      this.__resolveTermination = resolve;
    });
    this.__cycle();
  }

  __terminate(): void {
    this.__terminated = true;

    if (this.__activeJob) {
      this.__activeJob.__abortController?.abort();
    } else {
      this.__resolveTermination();
    }
  }

  private __cycle = (): Awaitable<void> => {
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
        result = job.__callback(abortController.signal);
      } catch (error) {
        __reject(error);
        return this.__cycle();
      }

      if (isPromiseLike(result)) {
        return result.then(__resolve, __reject).then(this.__cycle);
      } else {
        __resolve(result);
      }

      return this.__cycle();
    });
  };
}
