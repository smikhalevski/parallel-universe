/**
 * Promise-based lock implementation.
 *
 * When someone tries to acquire a {@link Lock} they receive a `Promise` for a release callback that is resolved as
 * soon as previous lock owner invokes their release callback.
 *
 * @see {@link https://en.wikipedia.org/wiki/Lock_(computer_science) Lock (computer science)}
 */
export class Lock {

  private _promise?: Promise<unknown>;
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
    let release: () => void;

    let promise = new Promise<void>((resolve) => {
      release = () => {
        resolve();

        if (this._promise === promise) {
          this._promise = undefined;
        }
        this._listener?.();
      };
    });

    if (this._promise) {
      const prevPromise = this._promise;
      const nextPromise = promise;
      this._promise = promise = prevPromise.then(() => nextPromise);
      return prevPromise.then(() => release);
    }

    this._promise = promise;
    this._listener?.();

    return Promise.resolve(release!);
  }
}
