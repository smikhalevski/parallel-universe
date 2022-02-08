import {Awaitable} from '../shared-types';
import {isPromiseLike} from '../isPromiseLike';
import {AsyncQueue} from '../AsyncQueue';

/**
 * @internal
 */
export interface PoolJob {
  __ac?: AbortController;
  __cb: (signal: AbortSignal) => Awaitable<unknown>;
  __resolve: (result: any) => void;
  __reject: (reason: any) => void;
}

/**
 * Worker picks jobs from the queue, invokes associated callbacks and fulfills the `Promise`.
 *
 * @internal
 */
export class PoolWorker {

  public __terminated = false;
  public __promise;
  public __activeJob: PoolJob | undefined;

  private __jobs;
  private __resolve!: () => void;

  public constructor(jobs: AsyncQueue<PoolJob>) {
    this.__jobs = jobs;
    this.__promise = new Promise<void>((resolve) => {
      this.__resolve = resolve;
    });
    this.__loop();
  }

  public __terminate(): void {
    this.__terminated = true;

    if (this.__activeJob) {
      this.__activeJob.__ac?.abort();
    } else {
      this.__resolve();
    }
  }

  private __loop = (): Awaitable<void> => {
    this.__activeJob = undefined;

    if (this.__terminated) {
      this.__resolve();
      return;
    }

    return this.__jobs.takeAck().then((ack) => {

      if (this.__terminated) {
        return;
      }

      const job = this.__activeJob = ack();
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
