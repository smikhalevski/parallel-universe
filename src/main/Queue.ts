export class Queue<T> {

  protected values: T[] = [];

  private _takers: ((ack: () => T | undefined) => void)[] = [];

  public take(): Promise<T> {
    return new Promise((resolve) => {
      this.takeAck((ack) => resolve(ack()!));
    })
  }

  public takeAck(taker: (ack: () => T | undefined) => void): void {
    if (this.values.length) {
      let stale = false;
      let value: T | undefined;
      taker(() => {
        if (stale) {
          return value;
        }
        return value = this.values.shift();
      });
      stale = true;
    }
    this._takers.push(taker);
  }

  public add(...values: T[]): this {
    let i = 0;
    let j = 0;

    while (i < values.length && j < this._takers.length) {
      let stale = false;
      let value: T | undefined;
      this._takers[j](() => {
        if (stale) {
          return value;
        }
        ++i;
        return value = this.values.shift();
      });
      stale = true;
      ++j;
    }
    if (j !== 0) {
      this._takers.splice(0, j);
    }
    if (i !== values.length) {
      this.values.push(...values.slice(i));
    }
    return this;
  }
}
