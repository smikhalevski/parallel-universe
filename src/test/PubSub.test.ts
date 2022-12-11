import { PubSub } from '../main';

describe('PubSub', () => {
  test('publishes a value', () => {
    const subscriber = jest.fn();
    const eventBus = new PubSub<number>();

    eventBus.subscribe(subscriber);

    eventBus.publish(123);

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith(123);
  });

  test('unsubscribes subscriber', () => {
    const subscriber = jest.fn();
    const eventBus = new PubSub<number>();

    const unsubscribe = eventBus.subscribe(subscriber);

    unsubscribe();

    eventBus.publish(123);

    expect(subscriber).toHaveBeenCalledTimes(0);
  });
});
