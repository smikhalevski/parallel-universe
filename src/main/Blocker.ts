import { PubSub } from './PubSub';

/**
 * Provides mechanism for blocking async processes and unblocking them from an external context.
 *
 * @template T The value that can be passed to {@linkcode unblock} to resolve the {@linkcode block} promise.
 */
export class Blocker<T = void> {
  private _pubSub = new PubSub();
  private _promise?: Promise<T>;
  private _release?: (result: T) => void;

  /**
   * `true` if {@linkcode Blocker} was blocked and wasn't unblocked yet.
   */
  get blocked() {
    return this._release != null;
  }

  /**
   * Returns promises that is fulfilled with the result passed to {@linkcode unblock}. If blocker is already blocked
   * then the same promise is returned.
   */
  block(): Promise<T> {
    if (!this._promise) {
      this._promise = new Promise(resolve => {
        this._release = resolve;
      });
      this._pubSub.publish();
    }
    return this._promise;
  }

  /**
   * Fulfills the promise returned from {@linkcode block}. If the blocker isn't blocked then no-op.
   */
  unblock(result: T): void {
    const { _release } = this;

    if (_release) {
      this._release = undefined;
      _release(result);
      this._pubSub.publish();
    }
  }

  /**
   * Subscribes a listener to {@linkcode blocked} status changes.
   *
   * @param listener The listener that would be notified.
   * @returns The callback to unsubscribe the listener.
   */
  subscribe(listener: () => void): () => void {
    return this._pubSub.subscribe(listener);
  }
}
