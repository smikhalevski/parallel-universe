import {EventBus} from '@smikhalevski/event-bus';

/**
 * Promise-based lock implementation.
 *
 * When someone tries to acquire a {@link Lock} they receive a `Promise` for a release callback that is resolved as
 * soon as previous lock owner invokes their release callback.
 *
 * @see {@link https://en.wikipedia.org/wiki/Lock_(computer_science) Lock (computer science)}
 */
export class Lock {

  private _eventBus = new EventBus();
  private _promise?: Promise<() => void>;

  /**
   * `true` if {@link Lock} was acquired and wasn't released yet.
   */
  public get locked() {
    return this._promise != null;
  }

  /**
   * Waits for the {@link Lock} to become available and resolves with the callback that releases the lock.
   */
  public acquire(): Promise<() => void> {
    const {_promise} = this;

    let promise: Promise<() => void>;

    const release = () => {
      if (this._promise === promise) {
        this._promise = undefined;
      }
      this._eventBus.publish();
    };

    if (_promise) {
      this._promise = promise = _promise.then(() => release);
    } else {
      this._promise = promise = Promise.resolve(release);
      this._eventBus.publish();
    }

    return promise;
  }

  /**
   * Subscribes a listener to the {@link locked} status changes.
   *
   * @param listener The listener that would be notified.
   * @returns The callback to unsubscribe the listener.
   */
  public subscribe(listener: () => void): () => void {
    return this._eventBus.subscribe(listener);
  }
}
