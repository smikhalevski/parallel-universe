import { AbortableCallback, AsyncResult, Awaitable } from './shared-types';
import { PubSub } from './PubSub';
import { isEqual, isPromiseLike } from './utils';

/**
 * The async result that may be updated over time.
 *
 * @template T The result stored by the execution.
 */
export interface Execution<T = any> extends AsyncResult<T> {
  /**
   * `true` if an execution is currently pending, or `false` otherwise.
   */
  isPending: boolean;

  /**
   * The promise of the pending execution, or `null` if there's no pending execution. Never rejected.
   */
  promise: Promise<void> | null;

  /**
   * Returns a {@link result}, or the default value if the result isn't available.
   *
   * @param defaultValue The default value.
   */
  getOrDefault(defaultValue: T): T;

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
  isFulfilled = false;
  isRejected = false;
  result: T | undefined;
  reason: any;
  promise: Promise<void> | null = null;

  private _pubSub = new PubSub();
  private _abortController: AbortController | null = null;

  get isSettled() {
    return this.isFulfilled || this.isRejected;
  }

  get isPending() {
    return this.promise !== null;
  }

  /**
   * Instantly aborts pending execution (if any), marks executor as pending and invokes the callback.
   *
   * If other execution was started before the promise returned by the callback is fulfilled then the signal is aborted
   * and the returned result is ignored.
   *
   * The returned promise is never rejected.
   *
   * @param cb The callback that returns the new result for the executor to store.
   * @returns The promise that is resolved when `cb` result is settled.
   */
  execute(cb: AbortableCallback<T | undefined>): Promise<void> {
    this._abortController?.abort();

    const abortController = new AbortController();
    this._abortController = abortController;

    const promise = new Promise<T | undefined>(resolve => {
      resolve(cb(abortController.signal));
    }).then(
      result => {
        if (this._abortController === abortController) {
          this._abortController = null;
          this.resolve(result);
        }
      },
      reason => {
        if (this._abortController === abortController) {
          this._abortController = null;
          this.reject(reason);
        }
      }
    );

    if (this._abortController === abortController) {
      this.promise = promise;
      this._pubSub.publish();
    }

    return promise;
  }

  getOrDefault(defaultValue: T): T {
    return this.isFulfilled ? this.result! : defaultValue;
  }

  /**
   * Clears available results and doesn't affect the pending execution.
   */
  clear(): this {
    if (this.isSettled) {
      this.isFulfilled = this.isRejected = false;
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
      this.execute(() => result);
      return this;
    }
    if (this.promise || !this.isFulfilled || !isEqual(this.result, result)) {
      this._abortController?.abort();
      this._abortController = this.promise = null;
      this.isFulfilled = true;
      this.isRejected = false;
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
    if (this.promise || !this.isRejected || !isEqual(this.reason, reason)) {
      this._abortController?.abort();
      this._abortController = this.promise = null;
      this.isFulfilled = false;
      this.isRejected = true;
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
