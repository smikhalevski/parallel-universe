export class PubSub<T = void> {
  private _retainedValues: T[] = [];
  private _listeners: Array<(value: T) => boolean | void> = [];

  constructor(public retainedCount = 0) {}

  publish(value: T): void {
    const { retainedCount, _retainedValues } = this;

    let processed = value === undefined;
    let errored = false;
    let error;

    for (const listener of this._listeners) {
      try {
        processed = listener(value) !== false || processed;
      } catch (e) {
        errored = true;
        error = e;
      }
    }

    if (!processed && retainedCount > 0) {
      if (_retainedValues.length > retainedCount) {
        _retainedValues.splice(0, _retainedValues.length - retainedCount);
      }
      _retainedValues.push(value);
    }

    if (errored) {
      throw error;
    }
  }

  subscribe(listener: (value: T) => any): () => void {
    const { _retainedValues, _listeners } = this;

    if (_listeners.indexOf(listener) === -1) {
      for (let i = 0; i < _retainedValues.length; ++i) {
        if (listener(_retainedValues[i]) !== false) {
          _retainedValues.splice(i--, 1);
        }
      }
      _listeners.push(listener);
    }

    return () => {
      const index = _listeners.indexOf(listener);

      if (index !== -1) {
        _listeners.splice(index, 1);
      }
    };
  }

  /**
   * Iterates over retained values.
   */
  [Symbol.iterator](): IterableIterator<T> {
    return this._retainedValues[Symbol.iterator]();
  }
}
