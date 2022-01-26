/**
 * @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Deferred Deferred on MDN}
 */
export class Deferred<T> {

  public readonly promise: Promise<T>;
  public resolve!: (result: PromiseLike<T> | T) => void;
  public reject!: (reason?: any) => void;

  public constructor(parent?: Deferred<unknown> | PromiseLike<unknown>) {
    const promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    if (parent instanceof Deferred) {
      this.promise = parent.promise.then(() => promise);
      return;
    }
    if (parent?.then) {
      const p = parent.then(() => promise);
      this.promise = p instanceof Promise ? p : Promise.resolve(p);
      return;
    }
    this.promise = promise;
  }
}
