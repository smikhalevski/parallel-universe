import { PubSub } from './PubSub';

/**
 * Promise-based lock implementation.
 *
 * When someone tries to acquire a {@link Lock} they receive a promise for a release callback that is fulfilled as soon
 * as previous lock owner invokes their release callback.
 *
 * @see https://en.wikipedia.org/wiki/Lock_(computer_science) Lock (computer science)
 */
export class Lock {
  private _pubSub = new PubSub();
  private _promise?: Promise<() => void>;

  /**
   * `true` if {@link Lock} was acquired and wasn't released yet.
   */
  get isLocked() {
    return this._promise != null;
  }

  /**
   * Waits for the {@link Lock} to become available and fulfills it with the callback that releases the lock.
   */
  acquire(): Promise<() => void> {
    const { _promise } = this;

    let promise: Promise<() => void>;

    const release = () => {
      if (this._promise === promise) {
        this._promise = undefined;
      }
      this._pubSub.publish();
    };

    if (_promise) {
      this._promise = promise = _promise.then(() => release);
    } else {
      this._promise = promise = Promise.resolve(release);
      this._pubSub.publish();
    }

    return promise;
  }

  /**
   * Subscribes a listener to the {@link isLocked} status changes.
   *
   * @param listener The listener that would be notified.
   * @returns The callback to unsubscribe the listener.
   */
  subscribe(listener: () => void): () => void {
    return this._pubSub.subscribe(listener);
  }
}
