import { PubSub, delay } from '../main';

describe('PubSub', () => {
  test('publishes a message', () => {
    const listenerMock = jest.fn();
    const pubSub = new PubSub<number>();

    pubSub.subscribe(listenerMock);

    pubSub.publish(111);

    expect(listenerMock).toHaveBeenCalledTimes(1);
    expect(listenerMock).toHaveBeenCalledWith(111);
  });

  test('does not add the same listener twice', () => {
    const listenerMock = jest.fn();
    const pubSub = new PubSub<number>();

    pubSub.subscribe(listenerMock);
    pubSub.subscribe(listenerMock);

    pubSub.publish(111);

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  test('unsubscribes a listener', () => {
    const listenerMock = jest.fn();
    const pubSub = new PubSub<number>();

    const unsubscribe = pubSub.subscribe(listenerMock);

    unsubscribe();

    pubSub.publish(111);

    expect(listenerMock).toHaveBeenCalledTimes(0);
  });

  test('calling unsubscribe multiple times is a noop', () => {
    const listenerMock1 = jest.fn();
    const listenerMock2 = jest.fn();
    const pubSub = new PubSub<number>();

    const unsubscribe = pubSub.subscribe(listenerMock1);
    pubSub.subscribe(listenerMock2);

    unsubscribe();
    unsubscribe();

    pubSub.publish(111);

    expect(listenerMock1).toHaveBeenCalledTimes(0);
    expect(listenerMock2).toHaveBeenCalledTimes(1);
  });

  test('waits for a specific message and resolves with that message', () => {
    const pubSub = new PubSub<number>();

    pubSub
      .waitFor(message => message === 42)
      .then(message => {
        expect(message).toBe(42);
      });

    pubSub.publish(10);
    pubSub.publish(20);
    pubSub.publish(42);
    pubSub.publish(30);
  });

  test('does not resolve if no message matches the predicate', () => {
    const listenerMock = jest.fn();
    const pubSub = new PubSub<number>();

    let result: number;

    pubSub
      .waitFor(message => message === 42)
      .then(message => {
        result = message;
        listenerMock();
      });

    pubSub.publish(10);
    pubSub.publish(20);
    pubSub.publish(30);

    delay(100).then(() => {
      expect(result).toBeUndefined();
      expect(listenerMock).toHaveBeenCalledTimes(0);
    });
  });
});
