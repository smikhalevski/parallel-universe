import { EventBus } from '@smikhalevski/event-bus';
import { AsyncResult, Awaitable } from './shared-types';
import { isPromiseLike } from './isPromiseLike';

/**
 * The callback that receives a signal that is aborted when execution must be stopped, and returns the execution result.
 */
export type ExecutorCallback<T> = (signal: AbortSignal) => Awaitable<T | undefined>;

/**
 * The async result that may be updated over time.
 *
 * @template T The result contained by the execution.
 */
export interface Execution<T = any> extends AsyncResult<T> {
  /**
   * `true` if an execution is currently pending, or `false` otherwise.
   */
  readonly pending: boolean;

  /**
   * The promise that is fulfilled when the execution is completed. This promise is never rejected.
   */
  promise: Promise<void> | undefined;

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
 * @template T The result returned by the executed callback.
 */
export class Executor<T = any> implements Execution<T> {
  fulfilled = false;
  rejected = false;
  result: T | undefined;
  reason: any;
  promise: Promise<void> | undefined;

  private _eventBus = new EventBus();
  private _abortController?: AbortController;

  get settled() {
    return this.fulfilled || this.rejected;
  }

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
  execute(cb: ExecutorCallback<T>): Promise<void> {
    const prevAbortController = this._abortController;
    prevAbortController?.abort();

    this._abortController = undefined;
    const abortController = new AbortController();

    let result;
    try {
      result = cb(abortController.signal);
    } catch (error) {
      this.reject(error);
      return Promise.resolve();
    }

    if (!isPromiseLike(result)) {
      this.resolve(result);
      return Promise.resolve();
    }

    const promise = result.then(
      result => {
        if (abortController === this._abortController) {
          this._abortController = undefined;
          this.resolve(result);
        }
      },
      reason => {
        if (abortController === this._abortController) {
          this._abortController = undefined;
          this.reject(reason);
        }
      }
    );

    this._abortController = abortController;
    this.promise = promise instanceof Promise ? promise : Promise.resolve(promise);

    if (!prevAbortController) {
      this._eventBus.publish();
    }

    return this.promise;
  }

  /**
   * Clears available results and doesn't affect the pending execution.
   */
  clear(): this {
    if (this.fulfilled || this.rejected) {
      this.fulfilled = this.rejected = false;
      this.result = this.reason = undefined;
      this._eventBus.publish();
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
      this._abortController = this.promise = undefined;
      this._eventBus.publish();
    }
    return this;
  }

  /**
   * Aborts pending execution and fulfills it with the given result.
   */
  resolve(result: Awaitable<T> | undefined): this {
    if (isPromiseLike(result)) {
      this.execute(() => result);
      return this;
    }
    if (this.promise || !this.fulfilled || !Object.is(this.result, result)) {
      this._abortController?.abort();
      this.fulfilled = true;
      this.rejected = false;
      this.result = result;
      this.reason = this._abortController = this.promise = undefined;
      this._eventBus.publish();
    }
    return this;
  }

  /**
   * Instantly aborts pending execution and rejects with the given reason.
   */
  reject(reason: any): this {
    if (this.promise || !this.rejected || !Object.is(this.reason, reason)) {
      this._abortController?.abort();
      this.fulfilled = false;
      this.rejected = true;
      this.result = this._abortController = this.promise = undefined;
      this.reason = reason;
      this._eventBus.publish();
    }
    return this;
  }

  subscribe(listener: () => void): () => void {
    return this._eventBus.subscribe(listener);
  }
}
