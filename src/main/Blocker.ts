import { EventBus } from '@smikhalevski/event-bus';

/**
 * Provides mechanism for blocking async processes and unblocking them from an external context.
 *
 * @template T The value that can be passed to {@link unblock} to resolve the {@link block} promise.
 */
export class Blocker<T = void> {
  private _eventBus = new EventBus();
  private _promise?: Promise<T>;
  private _release?: (result: T) => void;

  /**
   * `true` if {@link Blocker} was blocked and wasn't unblocked yet.
   */
  get blocked() {
    return this._release != null;
  }

  /**
   * Returns promises that is fulfilled with the result passed to {@link unblock}. If blocker is already blocked then
   * the same promise is returned.
   */
  block(): Promise<T> {
    if (!this._promise) {
      this._promise = new Promise(resolve => {
        this._release = resolve;
      });
      this._eventBus.publish();
    }
    return this._promise;
  }

  /**
   * Fulfills the promise returned from {@link block}. If the blocker isn't blocked then no-op.
   */
  unblock(result: T): void {
    const { _release } = this;

    if (_release) {
      this._release = undefined;
      _release(result);
      this._eventBus.publish();
    }
  }

  /**
   * Subscribes a listener to {@link blocked} status changes.
   *
   * @param listener The listener that would be notified.
   * @returns The callback to unsubscribe the listener.
   */
  subscribe(listener: () => void): () => void {
    return this._eventBus.subscribe(listener);
  }
}
