import { Awaitable } from '../shared-types';
import { isPromiseLike } from '../isPromiseLike';
import { AsyncQueue } from '../AsyncQueue';

export interface Job {
  abortController: AbortController | null;

  callback(signal: AbortSignal): Awaitable<unknown>;

  resolve(result: any): void;

  reject(reason: any): void;
}

/**
 * Worker picks jobs from the queue, invokes associated callbacks and fulfills the promise.
 */
export class Worker {
  terminated = false;
  terminationPromise;
  activeJob: Job | null = null;

  private _jobs: AsyncQueue<Job>;
  private _resolveTermination!: () => void;

  constructor(jobs: AsyncQueue<Job>) {
    this._jobs = jobs;
    this.terminationPromise = new Promise<void>(resolve => {
      this._resolveTermination = resolve;
    });
    this._cycle();
  }

  terminate(): void {
    this.terminated = true;

    if (this.activeJob !== null) {
      this.activeJob.abortController?.abort();
    } else {
      this._resolveTermination();
    }
  }

  private _cycle = (): Awaitable<void> => {
    this.activeJob = null;

    if (this.terminated) {
      this._resolveTermination();
      return;
    }

    return this._jobs.takeAck().then(([job, ack]) => {
      if (this.terminated) {
        return;
      }

      ack();

      this.activeJob = job;

      const { resolve, reject } = job;
      const abortController = new AbortController();

      job.abortController = abortController;

      let result;
      try {
        result = job.callback(abortController.signal);
      } catch (error) {
        reject(error);
        return this._cycle();
      }

      if (isPromiseLike(result)) {
        return result.then(resolve, reject).then(this._cycle);
      } else {
        resolve(result);
      }

      return this._cycle();
    });
  };
}
