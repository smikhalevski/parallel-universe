import { expect, test, vi } from 'vitest';
import { PubSub } from '../main/index.js';

test('publishes a message', () => {
  const listenerMock = vi.fn();
  const pubSub = new PubSub<number>();

  pubSub.subscribe(listenerMock);

  pubSub.publish(111);

  expect(listenerMock).toHaveBeenCalledTimes(1);
  expect(listenerMock).toHaveBeenCalledWith(111);
});

test('does not add the same listener twice', () => {
  const listenerMock = vi.fn();
  const pubSub = new PubSub<number>();

  pubSub.subscribe(listenerMock);
  pubSub.subscribe(listenerMock);

  pubSub.publish(111);

  expect(listenerMock).toHaveBeenCalledTimes(1);
});

test('unsubscribes a listener', () => {
  const listenerMock = vi.fn();
  const pubSub = new PubSub<number>();

  const unsubscribe = pubSub.subscribe(listenerMock);

  unsubscribe();

  pubSub.publish(111);

  expect(listenerMock).toHaveBeenCalledTimes(0);
});

test('calling unsubscribe multiple times is a noop', () => {
  const listenerMock1 = vi.fn();
  const listenerMock2 = vi.fn();
  const pubSub = new PubSub<number>();

  const unsubscribe = pubSub.subscribe(listenerMock1);
  pubSub.subscribe(listenerMock2);

  unsubscribe();
  unsubscribe();

  pubSub.publish(111);

  expect(listenerMock1).toHaveBeenCalledTimes(0);
  expect(listenerMock2).toHaveBeenCalledTimes(1);
});

test('waits for a specific message and resolves with that message', async () => {
  const pubSub = new PubSub<number>();
  const promise = pubSub.waitFor((message): message is 42 => message === 42);

  pubSub.publish(10);
  pubSub.publish(20);
  pubSub.publish(42);
  pubSub.publish(30);

  await expect(promise).resolves.toBe(42);
});

test('aborts the waiter of the specific message', () => {
  const predicateMock = vi.fn();
  const pubSub = new PubSub<number>();
  const promise = pubSub.waitFor(message => message === 42);

  promise.then(predicateMock, () => {});
  promise.abort();

  pubSub.publish(42);

  expect(predicateMock).not.toHaveBeenCalled();
});

test('can unsubscribe in listener', () => {
  const pubSub = new PubSub();
  const listenerMock1 = vi.fn(() => {
    unsubscribe1();
  });
  const listenerMock2 = vi.fn();

  const unsubscribe1 = pubSub.subscribe(listenerMock1);
  pubSub.subscribe(listenerMock2);

  pubSub.publish();

  expect(listenerMock1).toHaveBeenCalledTimes(1);
  expect(listenerMock2).toHaveBeenCalledTimes(1);
});
