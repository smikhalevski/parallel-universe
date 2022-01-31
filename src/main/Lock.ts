/**
 * Promise-based lock implementation.
 *
 * When someone tries to acquire a {@link Lock} they receive a `Promise` for a release callback that is resolved as
 * soon as previous lock owner invokes their release callback.
 *
 * @see {@link https://en.wikipedia.org/wiki/Lock_(computer_science) Lock (computer science)}
 */
export class Lock {

  private _promise?: Promise<() => void>;
  private readonly _listener;

  /**
   * Creates a new {@link Lock} instance.
   *
   * @param listener The listener that would be notified about locked status changes.
   */
  public constructor(listener?: () => void) {
    this._listener = listener;
  }

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
    const {_promise, _listener} = this;

    let promise: Promise<() => void>;

    const release = () => {
      if (this._promise === promise) {
        this._promise = undefined;
      }
      const {_listener} = this;
      _listener?.();
    };

    if (_promise) {
      this._promise = promise = _promise.then(() => release);
    } else {
      this._promise = promise = Promise.resolve(release);
      _listener?.();
    }

    return promise;
  }
}
