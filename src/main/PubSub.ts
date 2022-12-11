/**
 * Publish–subscribe pattern implementation that guarantees the delivery of published messages even if any of
 * subscribers would throw an error.
 *
 * @template T The published message.
 */
export class PubSub<T = void> {
  private _messages: T[] = [];
  private _subscribers: Array<(value: T) => unknown> = [];

  /**
   * Creates a new {@linkcode PubSub} instance.
   *
   * @param [retainableSize = 0] The maximum number of messages that are retained if they weren't processed by at least
   * one subscriber. If the message wasn't processed but the retainable size is reached, then the earliest message is
   * removed and the latest message is added.
   */
  constructor(
    /**
     * The maximum number of messages that are retained if they weren't processed by at least one subscriber.
     */
    public retainableSize = 0
  ) {}

  /**
   * Synchronously invokes subscribers and passes the message. If there are retained messages, they are synchronously
   * passed to the subscriber.
   *
   * @param message The published message. If `undefined` is passed as a message then it is never retained.
   */
  publish(message: T): void {
    const { retainableSize, _messages } = this;

    let processed = message === undefined;
    let errored = false;
    let error;

    for (const subscriber of this._subscribers) {
      try {
        processed = subscriber(message) !== false || processed;
      } catch (e) {
        if (!errored) {
          errored = true;
          error = e;
        }
      }
    }

    if (!processed && retainableSize > 0) {
      if (_messages.length >= retainableSize) {
        _messages.splice(0, _messages.length - retainableSize + 1);
      }
      _messages.push(message);
    }

    if (errored) {
      throw error;
    }
  }

  /**
   * Adds a subscriber that would receive all messages published via {@linkcode publish}.
   *
   * @param subscriber The callback.
   * @returns The callback that unsubscribes the subscriber.
   */
  subscribe(subscriber: (message: T) => any): () => void {
    const { _messages, _subscribers } = this;

    if (_subscribers.indexOf(subscriber) === -1) {
      for (let i = 0; i < _messages.length; ++i) {
        if (subscriber(_messages[i]) !== false) {
          _messages.splice(i--, 1);
        }
      }
      _subscribers.push(subscriber);
    }

    return () => {
      const index = _subscribers.indexOf(subscriber);

      if (index !== -1) {
        _subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Iterates over retained messages.
   */
  [Symbol.iterator](): IterableIterator<T> {
    return this._messages[Symbol.iterator]();
  }
}
