/**
 * Publish–subscribe pattern implementation that guarantees the delivery of published messages even if any of listeners
 * would throw an error.
 *
 * @template T The published message.
 */
export class PubSub<T = void> {
  private _listeners: Array<(value: T) => unknown> = [];

  /**
   * Synchronously invokes listeners with the published message.
   *
   * @param message The published message.
   */
  publish(message: T): void {
    for (const listener of this._listeners) {
      listener(message);
    }
  }

  /**
   * Adds a listener that would receive all messages published via {@link publish}.
   *
   * @param listener The callback.
   * @returns The callback that unsubscribes the listener.
   */
  subscribe(listener: (message: T) => any): () => void {
    if (this._listeners.indexOf(listener) === -1) {
      this._listeners.push(listener);
    }
    return () => {
      const index = this._listeners.indexOf(listener);

      if (index !== -1) {
        this._listeners.splice(index, 1);
      }
    };
  }
}
