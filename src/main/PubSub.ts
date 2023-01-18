/**
 * Publish–subscribe pattern implementation that guarantees the delivery of published messages even if any of
 * subscribers would throw an error.
 *
 * @template T The published message.
 */
export class PubSub<T = void> {
  /**
   * The error handler that by {@linkcode PubSub} instances by default.
   *
   * @param error An error thrown by a subscriber.
   */
  static defaultErrorHandler = (error: unknown): void => {
    console.error(error);
  };

  /**
   * The list of subscribers.
   */
  private _subscribers: Array<(value: T) => unknown> = [];

  /**
   * Creates a new {@linkcode PubSub} instance.
   *
   * @param errorHandler The callback that is invoked if a subscriber throws an error.
   */
  constructor(
    /**
     * The callback that is invoked if a subscriber throws an error.
     */
    public errorHandler = PubSub.defaultErrorHandler
  ) {}

  /**
   * Synchronously invokes subscribers and passes the message. If there are retained messages, they are synchronously
   * passed to the subscriber.
   *
   * @param message The published message. If `undefined` is passed as a message then it is never retained.
   */
  publish(message: T): void {
    for (const subscriber of this._subscribers) {
      try {
        subscriber(message);
      } catch (error) {
        try {
          this.errorHandler(error);
        } catch (error) {
          console.error(error);
        }
      }
    }
  }

  /**
   * Adds a subscriber that would receive all messages published via {@linkcode publish}.
   *
   * @param subscriber The callback.
   * @returns The callback that unsubscribes the subscriber.
   */
  subscribe(subscriber: (message: T) => any): () => void {
    const { _subscribers } = this;

    const unsubscribe = () => {
      const index = _subscribers.indexOf(subscriber);

      if (index !== -1) {
        _subscribers.splice(index, 1);
      }
    };

    if (_subscribers.indexOf(subscriber) === -1) {
      _subscribers.push(subscriber);
    }
    return unsubscribe;
  }
}
