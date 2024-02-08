import { AbortableCallback, AsyncResult, Awaitable } from './types';
import { PubSub } from './PubSub';
import { isEqual, isPromiseLike } from './utils';

/**
 * Manages async callback execution process and provides ways to access execution results, abort or replace an
 * execution, and subscribe to state changes.
 *
 * @template T The result stored by the executor.
 */
export class Executor<T = any> implements AsyncResult<T> {
  isFulfilled = false;
  isRejected = false;
  result: T | undefined;
  reason: any;

  /**
   * The promise of the pending execution, or `null` if there's no pending execution.
   */
  promise: Promise<AsyncResult<T>> | null = null;

  /**
   * The last callback that was executed by the executor.
   */
  executee: AbortableCallback<T> | null = null;

  private _pubSub = new PubSub();
  private _abortController: AbortController | null = null;

  /**
   * `true` if result was fulfilled or rejected, or `false` otherwise.
   */
  get isSettled() {
    return this.isFulfilled || this.isRejected;
  }

  /**
   * `true` if an execution is currently pending, or `false` otherwise.
   */
  get isPending() {
    return this.promise !== null;
  }

  /**
   * Instantly aborts pending execution (if any), marks executor as pending and invokes the callback.
   *
   * If other execution was started before the promise returned by the callback is fulfilled then the signal is aborted
   * and the returned result is ignored.
   *
   * @param cb The callback that returns the new result for the executor to store.
   * @returns The promise that is resolved with the result of the callback execution.
   */
  execute(cb: AbortableCallback<T>): Promise<AsyncResult<T>> {
    this.executee = cb;

    if (this._abortController) {
      this._abortController.abort();
    }

    const abortController = new AbortController();
    this._abortController = abortController;

    const fulfill = (result: T): AsyncResult<T> => {
      if (this._abortController === abortController) {
        this._abortController = null;
        this.resolve(result);

        return {
          isFulfilled: true,
          isRejected: false,
          result,
          reason: undefined,
        };
      }
      return {
        isFulfilled: false,
        isRejected: true,
        result: undefined,
        reason: new Error('Aborted'),
      };
    };

    const reject = (reason: unknown): AsyncResult<T> => {
      if (this._abortController === abortController) {
        this._abortController = null;
        this.reject(reason);
      }
      return {
        isFulfilled: false,
        isRejected: true,
        result: undefined,
        reason,
      };
    };

    let result;

    try {
      result = cb(abortController.signal);
    } catch (error) {
      return Promise.resolve(reject(error));
    }

    if (isPromiseLike(result)) {
      const promise = Promise.resolve(result).then(fulfill, reject);

      if (this._abortController === abortController) {
        this.promise = promise;
        this._pubSub.publish();
      }
      return promise;
    }

    return Promise.resolve(fulfill(result));
  }

  /**
   * Returns a {@link result}, or the default value if the result isn't available.
   *
   * @param defaultValue The default value.
   */
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
  resolve(result: Awaitable<T>): this {
    if (isPromiseLike(result)) {
      this.execute(() => result);
      return this;
    }
    if (this.promise || !this.isFulfilled || !isEqual(this.result, result)) {
      if (this._abortController) {
        this._abortController.abort();
      }
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
      if (this._abortController) {
        this._abortController.abort();
      }
      this._abortController = this.promise = null;
      this.isFulfilled = false;
      this.isRejected = true;
      this.result = undefined;
      this.reason = reason;
      this._pubSub.publish();
    }
    return this;
  }

  /**
   * Subscribes a listener to the execution state changes.
   *
   * @param listener The listener that would be notified.
   * @returns The callback to unsubscribe the listener.
   */
  subscribe(listener: () => void): () => void {
    return this._pubSub.subscribe(listener);
  }
}
