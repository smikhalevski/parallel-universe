import { AbortablePromise } from './AbortablePromise';
import { PubSub } from './PubSub';
import { AbortableCallback, Awaitable } from './types';
import { isEqual, isPromiseLike } from './utils';

/**
 * Manages async callback execution process and provides ways to access execution results, abort or replace an
 * execution, and subscribe to its state changes.
 *
 * @template T The value stored by the executor.
 */
export class Executor<T = any> {
  /**
   * `true` if the result was fulfilled with a value, or `false` otherwise.
   */
  isFulfilled = false;

  /**
   * `true` if the result was rejected with a reason, or `false` otherwise.
   */
  isRejected = false;

  /**
   * The value or `undefined` if rejected.
   */
  value: T | undefined;

  /**
   * The reason of failure.
   */
  reason: any;

  /**
   * The promise of the pending execution, or `null` if there's no pending execution.
   */
  promise: AbortablePromise<T> | null = null;

  private _pubSub = new PubSub();

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
  execute(cb: AbortableCallback<T>): AbortablePromise<T> {
    if (this.promise) {
      this.promise.abort();
    }

    const promise = new AbortablePromise<T>((resolve, reject, signal) => {
      signal.addEventListener('abort', () => {
        if (this.promise === promise) {
          this.abort();
        }
      });

      new Promise<T>(resolve => {
        resolve(cb(signal));
      }).then(
        value => {
          if (this.promise === promise) {
            this.promise = null;
            this.resolve(value);
          }
          resolve(value);
        },
        reason => {
          if (this.promise === promise) {
            this.promise = null;
            this.reject(reason);
          }
          reject(reason);
        }
      );
    });

    this.promise = promise;

    this._pubSub.publish();

    return promise;
  }

  /**
   * Returns a {@link value}, or the default value if the value isn't available.
   *
   * @param defaultValue The default value.
   */
  getOrDefault(defaultValue: T): T {
    return this.isFulfilled ? this.value! : defaultValue;
  }

  /**
   * Clears available results and doesn't affect the pending execution.
   */
  clear(): this {
    if (this.isSettled) {
      this.isFulfilled = this.isRejected = false;
      this.value = this.reason = undefined;
      this._pubSub.publish();
    }
    return this;
  }

  /**
   * Instantly aborts pending execution and preserves available results. Value (or error) returned from pending
   * callback is ignored. The signal passed to the executed callback is aborted.
   */
  abort(): this {
    const promise = this.promise;

    if (promise !== null) {
      this.promise = null;
      promise.abort();
      this._pubSub.publish();
    }
    return this;
  }

  /**
   * Aborts pending execution and fulfills it with the value.
   */
  resolve(value: Awaitable<T>): this {
    const promise = this.promise;

    if (isPromiseLike(value)) {
      this.execute(() => value);
      return this;
    }
    if (
      (promise !== null && (promise.abort(), !(this.promise = null))) ||
      !this.isFulfilled ||
      !isEqual(this.value, value)
    ) {
      this.isFulfilled = true;
      this.isRejected = false;
      this.value = value;
      this.reason = undefined;
      this._pubSub.publish();
    }
    return this;
  }

  /**
   * Instantly aborts pending execution and rejects with the reason.
   */
  reject(reason: any): this {
    const promise = this.promise;

    if (
      (promise !== null && (promise.abort(), !(this.promise = null))) ||
      !this.isRejected ||
      !isEqual(this.reason, reason)
    ) {
      this.isFulfilled = false;
      this.isRejected = true;
      this.value = undefined;
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
