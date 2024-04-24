/**
 * Provides mechanism for blocking async processes and unblocking them from an external context.
 *
 * @template T The value that can be passed to {@link unblock} to resolve the {@link block} promise.
 */
export class Blocker<T = void> {
  private _promise?: Promise<T>;
  private _unblock?: (value: T) => void;

  /**
   * `true` if {@link Blocker} is blocked and wasn't unblocked yet, or `false` otherwise.
   */
  get isBlocked() {
    return this._unblock !== undefined;
  }

  /**
   * Returns promises that is fulfilled with the result passed to {@link unblock}. If blocker is already blocked
   * then the same promise is returned.
   */
  block(): Promise<T> {
    if (this._promise === undefined) {
      this._promise = new Promise(resolve => {
        this._unblock = resolve;
      });
    }
    return this._promise;
  }

  /**
   * Fulfills the promise returned from {@link block}. If the blocker isn't blocked then no-op.
   */
  unblock(value: T): void {
    const { _unblock } = this;

    if (_unblock !== undefined) {
      this._unblock = undefined;
      _unblock(value);
    }
  }
}
