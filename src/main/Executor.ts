import {isPromiseLike} from './utils';
import {AwaitableLike} from './util-types';

export type ExecutorCallback<T> = (signal: AbortSignal) => AwaitableLike<T | undefined>;

export class Executor<T = any> {

  public pending = false;
  public resolved = false;
  public rejected = false;

  /**
   * The result of the last execution or `undefined` if there was no execution yet or if the last execution was
   * rejected.
   */
  public result: T | undefined;

  /**
   * The reason why the last execution was rejected.
   */
  public reason: any;

  /**
   * The promise of the currently pending execution or `undefined` if there's no pending execution.
   */
  public promise: Promise<void> | undefined;

  private _abortController?: AbortController;
  private readonly _listener;

  /**
   * Creates a new {@link Executor}.
   *
   * @param listener The callback that is triggered when the executor state was changed.
   */
  public constructor(listener?: () => void) {
    this._listener = listener;
  }

  /**
   * Instantly aborts pending execution (if any), marks executor as pending and invokes the callback.
   *
   * If other execution was started before the promise returned by the callback is fulfilled then the signal is aborted
   * and the returned result is ignored.
   *
   * The returned promise is never rejected.
   */
  public execute(cb: ExecutorCallback<T>): Promise<void> {

    this._abortController?.abort();
    this._abortController = new AbortController();

    let result;
    try {
      result = cb(this._abortController.signal);
    } catch (error) {
      this.reject(error);
      return Promise.resolve();
    }

    if (!isPromiseLike(result)) {
      this.resolve(result);
      return Promise.resolve();
    }

    if (!this.pending) {
      this.pending = true;
      this._notify();
    }

    const promise = result.then(
        (result) => {
          if (promise === this.promise) {
            this.resolve(result);
          }
        },
        (reason) => {
          if (promise === this.promise) {
            this.reject(reason);
          }
        },
    );

    return this.promise = promise instanceof Promise ? promise : Promise.resolve(promise);
  }

  /**
   * Clears available results and doesn't affect the pending execution.
   */
  public clear(): this {
    if (this.resolved || this.rejected) {
      this.resolved = this.rejected = false;
      this.result = this.reason = undefined;
      this._notify();
    }
    return this;
  }

  /**
   * Instantly aborts pending execution and preserves available results. Value (or error) returned from pending
   * callback is ignored. The signal passed to the executed callback is aborted.
   */
  public abort(): this {
    if (this.pending) {
      this._forceAbort();
      this._notify();
    }
    return this;
  }

  /**
   * Instantly aborts pending execution and resolves with the given result.
   *
   * ```ts
   * executor.resolve(new Promise((resolve, reject) => {
   *   // Async process
   * }));
   * // or
   * executor.resolve(value);
   * ```
   */
  public resolve(result: AwaitableLike<T> | undefined): this {
    if (isPromiseLike(result)) {
      this.execute(() => result);
      return this;
    }
    if (this.pending || !Object.is(this.result, result)) {
      this._forceAbort();
      this.resolved = true;
      this.rejected = false;
      this.result = result;
      this.reason = undefined;
      this._notify();
    }
    return this;
  }

  /**
   * Instantly aborts pending execution and rejects with the given reason.
   */
  public reject(reason: any): this {
    if (this.pending || !Object.is(this.reason, reason)) {
      this._forceAbort();
      this.resolved = false;
      this.rejected = true;
      this.result = undefined;
      this.reason = reason;
      this._notify();
    }
    return this;
  }

  private _notify() {
    const {_listener} = this;
    _listener?.();
  }

  private _forceAbort() {
    this.pending = false;
    this._abortController?.abort();
    this.promise = this._abortController = undefined;
  }
}
