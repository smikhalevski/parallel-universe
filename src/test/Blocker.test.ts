import { Blocker } from '../main';

describe('Blocker', () => {
  test('unblocked by default', () => {
    expect(new Blocker().blocked).toBe(false);
  });

  test('blocks', () => {
    const blocker = new Blocker();

    expect(blocker.block()).toBeInstanceOf(Promise);
    expect(blocker.blocked).toBe(true);
  });

  test('sequential blocks return the same promise', () => {
    const blocker = new Blocker();

    expect(blocker.block()).toBe(blocker.block());
  });

  test('unblocks with result', async () => {
    const blocker = new Blocker<number>();

    const promise = blocker.block();

    blocker.unblock(111);

    await expect(promise).resolves.toBe(111);
    expect(blocker.blocked).toBe(false);
  });

  test('no-op multiple unblocks', () => {
    const blocker = new Blocker();

    blocker.block();

    blocker.unblock();
    blocker.unblock();

    expect(blocker.blocked).toBe(false);
  });

  test('triggers listener when blocked', () => {
    const listenerMock = jest.fn();
    const blocker = new Blocker();
    blocker.subscribe(listenerMock);

    blocker.block();

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  test('triggers listener when unblocked', () => {
    const listenerMock = jest.fn();
    const blocker = new Blocker();
    blocker.subscribe(listenerMock);

    blocker.block();
    blocker.unblock();

    expect(listenerMock).toHaveBeenCalledTimes(2);
  });
});
