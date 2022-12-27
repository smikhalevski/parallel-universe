import { AsyncResult, Awaitable } from './public-types';
import { isPromiseLike } from './isPromiseLike';
import { PubSub } from './PubSub';

/**
 * The callback that receives a signal that is aborted when execution must be stopped, and returns the execution result.
 *
 * @template T The returned result.
 */
export type ExecutorCallback<T> = (signal: AbortSignal) => Awaitable<T>;

/**
 * The async result that may be updated over time.
 *
 * @template T The result stored by the execution.
 */
export interface Execution<T = any> extends AsyncResult<T> {
  /**
   * `true` if an execution is currently pending, or `false` otherwise.
   */
  pending: boolean;

  /**
   * The promise that is fulfilled when the execution is completed. This promise is never rejected.
   */
  promise: Promise<void> | null;

  /**
   * Subscribes a listener to the execution state changes.
   *
   * @param listener The listener that would be notified.
   * @returns The callback to unsubscribe the listener.
   */
  subscribe(listener: () => void): () => void;
}

/**
 * Manages async callback execution process and provides ways to access execution results, abort or replace an
 * execution, and subscribe to state changes.
 *
 * @template T The result stored by the executor.
 */
export class Executor<T = any> implements Execution<T> {
  fulfilled = false;
  rejected = false;
  result: T | undefined;
  reason: any;
  promise: Promise<void> | null = null;

  private _pubSub = new PubSub();
  private _abortController: AbortController | null = null;

  /**
   * `true` is an executor was {@linkcode fulfilled} with a {@linkcode result}, or {@linkcode rejected} with a
   * {@linkcode reason}, or `false` otherwise.
   */
  get settled() {
    return this.fulfilled || this.rejected;
  }

  /**
   * `true` if an executor has a pending promise, or `false` otherwise.
   */
  get pending() {
    return this.promise != null;
  }

  /**
   * Instantly aborts pending execution (if any), marks executor as pending and invokes the callback.
   *
   * If other execution was started before the promise returned by the callback is fulfilled then the signal is aborted
   * and the returned result is ignored.
   *
   * The returned promise is never rejected.
   */
  execute(cb: ExecutorCallback<T | undefined>): Promise<void> {
    this._abortController?.abort();
    this._abortController = null;

    const abortController = new AbortController();
    this._abortController = abortController;

    const promise = new Promise<T | undefined>(resolve => {
      resolve(cb(abortController.signal));
    }).then(
      result => {
        if (abortController === this._abortController) {
          this._abortController = null;
          this.resolve(result);
        }
      },
      reason => {
        if (abortController === this._abortController) {
          this._abortController = null;
          this.reject(reason);
        }
      }
    );

    this.promise = promise;
    this._pubSub.publish();

    return promise;
  }

  /**
   * Clears available results and doesn't affect the pending execution.
   */
  clear(): this {
    if (this.fulfilled || this.rejected) {
      this.fulfilled = this.rejected = false;
      this.result = this.reason = undefined;
      this._pubSub.publish();
    }
    return this;
  }

  /**
   * Instantly aborts pending execution and preserves available results. Value (or error) returned from pending
   * callback is ignored. The signal passed to the executed callback is aborted.
   */
  abort(): this {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = this.promise = null;
      this._pubSub.publish();
    }
    return this;
  }

  /**
   * Aborts pending execution and fulfills it with the given result.
   */
  resolve(result: Awaitable<T> | undefined): this {
    if (isPromiseLike(result)) {
      void this.execute(() => result);
      return this;
    }
    if (this.promise || !this.fulfilled || !Object.is(this.result, result)) {
      this._abortController?.abort();
      this._abortController = this.promise = null;
      this.fulfilled = true;
      this.rejected = false;
      this.result = result;
      this.reason = undefined;
      this._pubSub.publish();
    }
    return this;
  }

  /**
   * Instantly aborts pending execution and rejects with the given reason.
   */
  reject(reason: any): this {
    if (this.promise || !this.rejected || !Object.is(this.reason, reason)) {
      this._abortController?.abort();
      this._abortController = this.promise = null;
      this.fulfilled = false;
      this.rejected = true;
      this.result = undefined;
      this.reason = reason;
      this._pubSub.publish();
    }
    return this;
  }

  subscribe(listener: () => void): () => void {
    return this._pubSub.subscribe(listener);
  }
}
