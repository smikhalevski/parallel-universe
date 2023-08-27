/**
 * Publish–subscribe pattern implementation that guarantees the delivery of published messages even if any of listeners
 * would throw an error.
 *
 * @template T The published message.
 */
export class PubSub<T = void> {
  /**
   * The error handler that by {@link PubSub} instances by default.
   *
   * @param error An error thrown by a listener.
   */
  static defaultErrorHandler = (error: unknown): void => {
    console.error(error);
  };

  private _listeners: Array<(value: T) => unknown> = [];
  private _errorHandler;

  /**
   * Creates a new {@link PubSub} instance.
   *
   * @param errorHandler The callback that is invoked if a listener throws an error.
   */
  constructor(
    /**
     * The callback that is invoked if a listener throws an error.
     */
    errorHandler = PubSub.defaultErrorHandler
  ) {
    this._errorHandler = errorHandler;
  }

  /**
   * Synchronously invokes listeners with the published message.
   *
   * @param message The published message.
   */
  publish(message: T): void {
    for (const listener of this._listeners) {
      try {
        listener(message);
      } catch (error) {
        this._errorHandler(error);
      }
    }
  }

  /**
   * Adds a listener that would receive all messages published via {@link publish}.
   *
   * @param listener The callback.
   * @returns The callback that unsubscribes the listener.
   */
  subscribe(listener: (message: T) => any): () => void {
    const { _listeners } = this;

    const unsubscribe = () => {
      const index = _listeners.indexOf(listener);

      if (index !== -1) {
        _listeners.splice(index, 1);
      }
    };

    if (_listeners.indexOf(listener) === -1) {
      _listeners.push(listener);
    }
    return unsubscribe;
  }
}
