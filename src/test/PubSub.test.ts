import { PubSub } from '../main';

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

  test('delivers to all listeners and invokes error handler', () => {
    const errorHandlerMock = jest.fn();

    const listenerMock1 = jest.fn(() => {
      throw new Error('expected1');
    });
    const listenerMock2 = jest.fn(() => {
      throw new Error('expected2');
    });
    const pubSub = new PubSub(errorHandlerMock);

    pubSub.subscribe(listenerMock1);
    pubSub.subscribe(listenerMock2);

    pubSub.publish();

    expect(errorHandlerMock).toHaveBeenCalledTimes(2);
    expect(errorHandlerMock).toHaveBeenNthCalledWith(1, new Error('expected1'));
    expect(errorHandlerMock).toHaveBeenNthCalledWith(2, new Error('expected2'));

    expect(listenerMock1).toHaveBeenCalledTimes(1);
    expect(listenerMock2).toHaveBeenCalledTimes(1);
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
});
