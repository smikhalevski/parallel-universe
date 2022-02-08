import {noop} from './utils';

export type Ack<T> = () => T | undefined;

export class Queue<T> {

  public values: T[] = [];

  private _promise?: Promise<void>;
  private _resolve?: () => void;

  public take(): Promise<T> {
    return this.takeAck().then(acceptAck);
  }

  public takeAck(): Promise<Ack<T>> {

    let taken = false;
    let value: T | undefined;

    const ack: Ack<T> = () => {
      if (!taken) {
        taken = true;
        value = this.values.shift();
      }
      return value;
    };

    let resolveAck: (ack: Ack<T>) => void;

    const ackPromise = new Promise<Ack<T>>((resolve) => {
      resolveAck = resolve;
    });

    const provideAck = () => {
      if (this.values.length) {
        resolveAck(ack);
        return;
      }
      this._resolve = () => {
        this._resolve = undefined;
        resolveAck(ack);
      };
    };

    const revokeAck = () => {
      taken = true;

      if (this._promise === promise) {
        this._promise = undefined;
      }
    };

    let promise: Promise<void>;
    if (this._promise) {
      promise = this._promise = this._promise.then(provideAck).then(revokeAck);
    } else {
      promise = this._promise = ackPromise.then(noop).then(revokeAck);
      provideAck();
    }

    return ackPromise;
  }

  public add(...values: T[]): this {
    if (values.length) {
      this.values.push(...values);
      this._resolve?.();
    }
    return this;
  }
}

function acceptAck<T>(ack: Ack<T>): T {
  return ack()!;
}
