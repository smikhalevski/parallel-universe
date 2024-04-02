import { AbortablePromise } from './AbortablePromise';
import { PubSub } from './PubSub';
import { AbortableCallback, Awaitable } from './types';
import { isEqual, isPromiseLike, withSignal } from './utils';

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
   * `true` if {@link invalidate} was called on a settled executor and a new settlement hasn't occurred yet.
   */
  isStale = false;

  /**
   * The value or `undefined` if executor isn't {@link isFulfilled fulfilled}.
   */
  value: T | undefined;

  /**
   * The reason of failure or `undefined` if executor isn't {@link isRejected rejected}.
   */
  reason: any;

  /**
   * The promise of the pending execution, or `null` if there's no pending execution.
   */
  promise: AbortablePromise<T> | null = null;

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
   * The last callback passed to {@link execute}.
   */
  executee: AbortableCallback<T> | null = null;

  private _pubSub = new PubSub();

  /**
   * Executes a callback and populates the executor with the returned result.
   *
   * Instantly aborts pending execution (if any), marks executor as pending and then invokes the callback.
   *
   * If other execution was started before the promise returned by the callback is fulfilled then the signal is aborted
   * and the returned result is ignored.
   *
   * @param cb The callback that returns the new result for the executor to store.
   * @returns The promise that is resolved with the result of the callback execution.
   */
  execute(cb: AbortableCallback<T>): AbortablePromise<T> {
    this.executee = cb;

    const promise = new AbortablePromise<T>((resolve, reject, signal) => {
      signal.addEventListener('abort', () => {
        if (this.promise === promise) {
          this.promise = null;
          this._pubSub.publish();
        }
      });

      new Promise<T>(resolve => {
        resolve(withSignal(cb(signal), signal));
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

    const prevPromise = this.promise;

    this.promise = promise;

    if (prevPromise !== null) {
      prevPromise.abort();
    }

    this._pubSub.publish();

    return promise;
  }

  /**
   * Executes the last callback executed by this executor, or returns the promise of the pending execution.
   *
   * If there's no {@link executee} then the returned promise is rejected.
   *
   * @see {@link invalidate}
   */
  retry(): AbortablePromise<T> {
    if (this.promise !== null) {
      return this.promise;
    }
    if (this.executee !== null) {
      return this.execute(this.executee);
    }
    return new AbortablePromise<T>((_resolve, reject) => {
      reject(new Error("Executor doesn't have an executee"));
    });
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
      this.isFulfilled = this.isRejected = this.isStale = false;
      this.value = this.reason = undefined;
      this._pubSub.publish();
    }
    return this;
  }

  /**
   * Instantly aborts pending execution and preserves available results as is. Value (or error) returned from pending
   * callback is ignored. The signal passed to the executed callback is aborted.
   *
   * @param reason The abort reason passed to the pending promise.
   */
  abort(reason?: unknown): this {
    if (this.promise !== null) {
      this.promise.abort(reason);
    }
    return this;
  }

  /**
   * If the executor is settled then its value is marked as {@link isStale stale}.
   *
   * @see {@link retry}
   */
  invalidate(): this {
    if (this.isStale !== (this.isStale = this.isSettled)) {
      this._pubSub.publish();
    }
    return this;
  }

  /**
   * Aborts pending execution and fulfills the executor with the given value.
   */
  resolve(value: Awaitable<T>): this {
    const promise = this.promise;

    if (isPromiseLike(value)) {
      this.execute(() => value);
      return this;
    }
    if (
      (promise !== null && ((this.promise = null), promise.abort(), true)) ||
      this.isStale ||
      !this.isFulfilled ||
      !isEqual(this.value, value)
    ) {
      this.isFulfilled = true;
      this.isRejected = this.isStale = false;
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
      (promise !== null && ((this.promise = null), promise.abort(), true)) ||
      this.isStale ||
      !this.isRejected ||
      !isEqual(this.reason, reason)
    ) {
      this.isFulfilled = this.isStale = false;
      this.isRejected = true;
      this.value = undefined;
      this.reason = reason;
      this._pubSub.publish();
    }
    return this;
  }

  /**
   * Subscribes a listener to the executor state changes.
   *
   * @param listener The listener that would be notified.
   * @returns The callback to unsubscribe the listener.
   */
  subscribe(listener: () => void): () => void {
    return this._pubSub.subscribe(listener);
  }
}
