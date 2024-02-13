import { PubSub } from './PubSub';

/**
 * Provides mechanism for blocking async processes and unblocking them from an external context.
 *
 * @template T The value that can be passed to {@link unblock} to resolve the {@link block} promise.
 */
export class Blocker<T = void> {
  private _pubSub = new PubSub();
  private _promise?: Promise<T>;
  private _unblock?: (result: T) => void;

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
      this._pubSub.publish();
    }
    return this._promise;
  }

  /**
   * Fulfills the promise returned from {@link block}. If the blocker isn't blocked then no-op.
   */
  unblock(result: T): void {
    const { _unblock } = this;

    if (_unblock !== undefined) {
      this._unblock = undefined;
      _unblock(result);
      this._pubSub.publish();
    }
  }

  /**
   * Subscribes a listener to {@link isBlocked} status changes.
   *
   * @param listener The listener that would be notified.
   * @returns The callback to unsubscribe the listener.
   */
  subscribe(listener: () => void): () => void {
    return this._pubSub.subscribe(listener);
  }
}
