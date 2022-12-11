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

  test('delivers to all subscribers and re-throws the first error', () => {
    const subscriberMock1 = jest.fn(() => {
      throw new Error('expected1');
    });
    const subscriberMock2 = jest.fn(() => {
      throw new Error('expected2');
    });
    const pubSub = new PubSub();

    pubSub.subscribe(subscriberMock1);
    pubSub.subscribe(subscriberMock2);

    expect(() => pubSub.publish()).toThrow(new Error('expected1'));

    expect(subscriberMock1).toHaveBeenCalledTimes(1);
    expect(subscriberMock2).toHaveBeenCalledTimes(1);
  });

  test('replays retained messages when a subscriber is added', () => {
    const subscriberMock = jest.fn();
    const pubSub = new PubSub<number>(2);

    pubSub.publish(111);
    pubSub.publish(222);

    pubSub.subscribe(subscriberMock);

    expect(subscriberMock).toHaveBeenCalledTimes(2);
    expect(subscriberMock).toHaveBeenNthCalledWith(1, 111);
    expect(subscriberMock).toHaveBeenNthCalledWith(2, 222);
  });

  test('removes the earliest retained message if the retainable size is exceeded', () => {
    const subscriberMock = jest.fn();
    const pubSub = new PubSub<number>(2);

    pubSub.publish(111);
    pubSub.publish(222);
    pubSub.publish(333);

    pubSub.subscribe(subscriberMock);

    expect(subscriberMock).toHaveBeenCalledTimes(2);
    expect(subscriberMock).toHaveBeenNthCalledWith(1, 222);
    expect(subscriberMock).toHaveBeenNthCalledWith(2, 333);
  });

  test('undefined is never retained', () => {
    const subscriberMock = jest.fn();
    const pubSub = new PubSub<unknown>(100);

    pubSub.publish(undefined);
    pubSub.publish(111);

    pubSub.subscribe(subscriberMock);

    expect(subscriberMock).toHaveBeenCalledTimes(1);
    expect(subscriberMock).toHaveBeenNthCalledWith(1, 111);
  });

  test('does not retain a message if a subscriber returns undefined', () => {
    const subscriberMock1 = jest.fn();
    const subscriberMock2 = jest.fn();
    const pubSub = new PubSub<number>(1);

    pubSub.subscribe(subscriberMock1);

    pubSub.publish(111);

    pubSub.subscribe(subscriberMock2);

    expect(subscriberMock1).toHaveBeenCalledTimes(1);
    expect(subscriberMock1).toHaveBeenNthCalledWith(1, 111);
    expect(subscriberMock2).not.toHaveBeenCalled();
  });

  test('retains a message if a subscriber returns false', () => {
    const subscriberMock1 = jest.fn(() => false);
    const subscriberMock2 = jest.fn();
    const pubSub = new PubSub<number>(1);

    pubSub.subscribe(subscriberMock1);

    pubSub.publish(111);

    pubSub.subscribe(subscriberMock2);

    expect(subscriberMock1).toHaveBeenCalledTimes(1);
    expect(subscriberMock1).toHaveBeenNthCalledWith(1, 111);
    expect(subscriberMock2).toHaveBeenCalledTimes(1);
    expect(subscriberMock2).toHaveBeenNthCalledWith(1, 111);
  });

  test('unsubscribes a subscriber', () => {
    const subscriberMock = jest.fn();
    const pubSub = new PubSub<number>();

    const unsubscribe = pubSub.subscribe(subscriberMock);

    unsubscribe();

    pubSub.publish(111);

    expect(subscriberMock).toHaveBeenCalledTimes(0);
  });

  test('does not subscribe a subscriber that throws during retained messages replay', () => {
    const subscriberMock = jest.fn(() => {
      throw new Error('expected');
    });
    const pubSub = new PubSub<number>(10);

    pubSub.publish(111);

    expect(() => pubSub.subscribe(subscriberMock)).toThrow(new Error('expected'));
    expect(subscriberMock).toHaveBeenCalledTimes(1);

    pubSub.publish(222);

    expect(subscriberMock).toHaveBeenCalledTimes(1);
  });
});
