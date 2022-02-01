import {EventBus} from '@smikhalevski/event-bus';

/**
 * Provides mechanism for blocking async processes and unblocking them from an external context.
 *
 * @template T The type of value that can be passed to {@link unblock} to resolve the {@link block} `Promise`.
 */
export class Blocker<T = void> {

  private _eventBus = new EventBus();
  private _promise?: Promise<T>;
  private _resolve?: (result: T) => void;

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
      this._eventBus.publish();
    }
    return this._promise;
  }

  /**
   * Resolves the promise returned from {@link block}. If the blocker isn't blocked then no-op.
   */
  public unblock(result: T): void {
    const {_resolve} = this;

    if (_resolve) {
      this._resolve = undefined;
      _resolve(result);
      this._eventBus.publish();
    }
  }

  /**
   * Subscribes a listener to {@link blocked} status changes.
   *
   * @param listener The listener that would be notified.
   * @returns The callback to unsubscribe the listener.
   */
  public subscribe(listener: () => void): () => void {
    return this._eventBus.subscribe(listener);
  }
}
