import {noop} from './utils';

/**
 * Asynchronous queue that decouples value providers and consumers.
 */
export class AsyncQueue<T = any> {

  private _values: T[] = [];
  private _promise?: Promise<void>;
  private _resolve?: () => void;

  /**
   * Returns the number of values stored in this queue.
   */
  public get size() {
    return this._values.length;
  }

  /**
   * Returns a `Promise` that resolves with an element that was added to the queue via {@link add}. Elements are taken
   * in the same order they were added. Taken elements are returned from the queue.
   *
   * @returns The `Promise` that resolves with an element.
   */
  public take(): Promise<T> {
    return this.takeAck().then(acceptAck);
  }

  /**
   * Returns a `Promise` that resolves with an acknowledgement callback that returns an element. The acknowledgement
   * callback dequeues an element and returns it; all subsequent invocations of the acknowledgement callback would
   * return the same element.
   *
   * The acknowledgement callback must be either ignored or called on _the next tick_ after the returned `Promise` is
   * resolved, otherwise it is revoked and would throw an error.
   *
   * ```ts
   * queue.takeAck().then((ack) => {
   *   const value = ack();
   * })
   * ```
   *
   * @return The `Promise` that resolved with an element acknowledgement callback.
   */
  public takeAck(): Promise<() => T> {
    const {_promise} = this;

    let accepted = false;
    let revoked = false;
    let value: T;

    const ack = (): T => {
      if (accepted) {
        return value;
      }
      if (revoked) {
        throw new Error('Acknowledgement was revoked');
      }
      accepted = true;
      value = this._values.shift()!;
      return value;
    };

    let resolveAck: (ack: () => T) => void;

    const ackPromise = new Promise<() => T>((resolve) => {
      resolveAck = resolve;
    });

    const provideAck = () => {
      if (this._values.length) {
        resolveAck(ack);
        return;
      }
      this._resolve = () => {
        this._resolve = undefined;
        resolveAck(ack);
      };
    };

    const revokeAck = () => {
      revoked = true;

      if (this._promise === promise) {
        this._promise = undefined;
      }
    };

    let promise: Promise<void>;
    if (_promise) {
      promise = this._promise = _promise.then(provideAck).then(revokeAck);
    } else {
      promise = this._promise = ackPromise.then(noop).then(revokeAck);
      provideAck();
    }

    return ackPromise;
  }

  /**
   * Appends the new value to the queue.
   *
   * @param value The value to append.
   */
  public add(value: T): this {
    this._values.push(value);
    this._resolve?.();
    return this;
  }

  /**
   * Iterates over elements that are available in the queue.
   */
  public [Symbol.iterator](): IterableIterator<T> {
    return this._values[Symbol.iterator]();
  }
}

function acceptAck<T>(ack: () => T): T {
  return ack();
}
