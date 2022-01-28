import {Blocker} from '../main';

describe('Blocker', () => {

  test('unblocked by default', () => {
    expect(new Blocker().blocked).toBe(false);
  });

  test('blocks', () => {
    const blocker = new Blocker();

    expect(blocker.block()).toBeInstanceOf(Promise);
    expect(blocker.blocked).toBe(true);
  });

  test('sequential blocks return the same Promise', () => {
    const blocker = new Blocker();

    expect(blocker.block()).toBe(blocker.block());
  });

  test('unblocks with result', async () => {
    const blocker = new Blocker<string>();

    const promise = blocker.block();

    blocker.unblock('foo');

    await expect(promise).resolves.toBe('foo');
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
    const blocker = new Blocker(listenerMock);

    blocker.block();

    expect(listenerMock).toHaveBeenCalledTimes(1);
  });

  test('triggers listener when unblocked', () => {
    const listenerMock = jest.fn();
    const blocker = new Blocker(listenerMock);

    blocker.block();
    blocker.unblock();

    expect(listenerMock).toHaveBeenCalledTimes(2);
  });
});
