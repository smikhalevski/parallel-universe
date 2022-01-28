/**
 * Provides mechanism for blocking async processes and unblocking them from an external context.
 *
 * @template T The type of value that can be passed to {@link Blocker.unblock} to resolve the `Promise` returned by
 *     {@link Blocker.block}.
 */
export class Blocker<T = void> {

  private _promise?: Promise<T>;
  private _resolve?: (result: T) => void;
  private readonly _listener;

  /**
   * Creates a new {@link Blocker} instance.
   *
   * @param listener The listener that would be notified about blocked status changes.
   */
  public constructor(listener?: () => void) {
    this._listener = listener;
  }

  /**
   * `true` if {@link Blocker} was blocked and wasn't unblocked yet.
   */
  public get blocked() {
    return this._resolve != null;
  }

  /**
   * Returns promises that is resolved with the result passed to {@link unblock}. If blocker is already blocked then
   * the same promise is returned.
   */
  public block(): Promise<T> {
    if (!this._promise) {
      this._promise = new Promise((resolve) => {
        this._resolve = resolve;
      });
      this._listener?.();
    }
    return this._promise;
  }

  /**
   * Resolves the promise returned from {@link block}. If the blocker isn't blocked then no-op.
   */
  public unblock(result: T): void {
    if (this._resolve) {
      const resolve = this._resolve;
      this._resolve = undefined;
      resolve(result);
      this._listener?.();
    }
  }
}
