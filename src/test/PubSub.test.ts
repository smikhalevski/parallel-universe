import { PubSub } from '../main';

describe('PubSub', () => {
  test('publishes a message', () => {
    const subscriberMock = jest.fn();
    const pubSub = new PubSub<number>();

    pubSub.subscribe(subscriberMock);

    pubSub.publish(111);

    expect(subscriberMock).toHaveBeenCalledTimes(1);
    expect(subscriberMock).toHaveBeenCalledWith(111);
  });

  test('does not add the same subscriber twice', () => {
    const subscriberMock = jest.fn();
    const pubSub = new PubSub<number>();

    pubSub.subscribe(subscriberMock);
    pubSub.subscribe(subscriberMock);

    pubSub.publish(111);

    expect(subscriberMock).toHaveBeenCalledTimes(1);
  });

  test('delivers to all subscribers and invokes error handler', () => {
    const errorHandlerMock = jest.fn();

    const subscriberMock1 = jest.fn(() => {
      throw new Error('expected1');
    });
    const subscriberMock2 = jest.fn(() => {
      throw new Error('expected2');
    });
    const pubSub = new PubSub(errorHandlerMock);

    pubSub.subscribe(subscriberMock1);
    pubSub.subscribe(subscriberMock2);

    pubSub.publish();

    expect(errorHandlerMock).toHaveBeenCalledTimes(2);
    expect(errorHandlerMock).toHaveBeenNthCalledWith(1, new Error('expected1'));
    expect(errorHandlerMock).toHaveBeenNthCalledWith(2, new Error('expected2'));

    expect(subscriberMock1).toHaveBeenCalledTimes(1);
    expect(subscriberMock2).toHaveBeenCalledTimes(1);
  });

  test('unsubscribes a subscriber', () => {
    const subscriberMock = jest.fn();
    const pubSub = new PubSub<number>();

    const unsubscribe = pubSub.subscribe(subscriberMock);

    unsubscribe();

    pubSub.publish(111);

    expect(subscriberMock).toHaveBeenCalledTimes(0);
  });

  test('calling unsubscribe multiple times is a noop', () => {
    const subscriberMock1 = jest.fn();
    const subscriberMock2 = jest.fn();
    const pubSub = new PubSub<number>();

    const unsubscribe = pubSub.subscribe(subscriberMock1);
    pubSub.subscribe(subscriberMock2);

    unsubscribe();
    unsubscribe();

    pubSub.publish(111);

    expect(subscriberMock1).toHaveBeenCalledTimes(0);
    expect(subscriberMock2).toHaveBeenCalledTimes(1);
  });
});
