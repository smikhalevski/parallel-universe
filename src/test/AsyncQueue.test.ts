import { AsyncQueue } from '../main';

describe('AsyncQueue', () => {
  test('takes an existing value', async () => {
    const queue = new AsyncQueue();

    queue.add(111);

    await expect(queue.take()).resolves.toBe(111);
  });

  test('takes an added value', async () => {
    const queue = new AsyncQueue();

    const promise = queue.take();

    queue.add(111);

    await expect(promise).resolves.toBe(111);
  });

  test('takes an ack for an existing value', async () => {
    const queue = new AsyncQueue();

    queue.add(111);

    const [value, ack] = await queue.takeAck();

    expect(value).toBe(111);
    expect(ack).toBeInstanceOf(Function);
  });

  test('takes an ack for an added value', async () => {
    const queue = new AsyncQueue();

    const promise = queue.takeAck();

    queue.add(111);

    const [value, ack] = await promise;

    expect(value).toBe(111);
    expect(ack).toBeInstanceOf(Function);
  });

  test('calling an ack removes the value from the queue', async () => {
    const queue = new AsyncQueue();

    queue.add(111);

    await queue.takeAck().then(([, ack]) => {
      ack();
    });

    expect(queue.size).toBe(0);
  });

  test('ack is revoked if on next tick', async () => {
    const queue = new AsyncQueue();

    queue.add(111);

    const ack = await queue.takeAck().then(([, ack]) => ack);

    expect(ack).toThrow();
    expect(queue.size).toBe(1);
  });

  test('sequential ack is revoked if unused', async () => {
    const queue = new AsyncQueue();

    queue.add(111);
    queue.add(222);

    queue.takeAck().then(([, ack]) => {
      ack();
    });

    const ack = await queue.takeAck().then(([, ack]) => ack);

    expect(ack).toThrow();
    expect(queue.size).toBe(1);
  });

  test('blocking ack is not revoked', async () => {
    const queue = new AsyncQueue();

    queue.add(111);

    const ack = await queue.takeBlockingAck().then(([, ack]) => ack);

    ack();

    expect(queue.size).toBe(0);
  });

  test('unused ack passed to the next consumer', async () => {
    const queue = new AsyncQueue();

    queue.add(111);

    queue.takeAck(); // Unused ack is revoked

    const [value] = await queue.takeAck();

    expect(value).toBe(111);
  });

  test('ack is not revoked if used', async () => {
    const queue = new AsyncQueue();

    queue.add(111);

    const ack = await queue.takeAck().then(([, ack]) => {
      ack();
      return ack;
    });

    expect(ack).not.toThrow();
  });

  test('acks are provided in fifo order', async () => {
    const consumerMock = jest.fn();
    const queue = new AsyncQueue();

    const promise1 = queue.takeAck().then(([value, ack]) => {
      ack();
      consumerMock(value);
    });

    const promise2 = queue.takeAck().then(([value, ack]) => {
      ack();
      consumerMock(value);
    });

    queue.add(111);
    queue.add(222);

    await promise1;

    expect(consumerMock).toHaveBeenCalledTimes(1);
    expect(consumerMock).toHaveBeenNthCalledWith(1, 111);

    await promise2;

    expect(consumerMock).toHaveBeenCalledTimes(2);
    expect(consumerMock).toHaveBeenNthCalledWith(2, 222);
  });

  test('returns the size of the queue', () => {
    const queue = new AsyncQueue();

    queue.add(111);
    queue.add(222);

    expect(queue.size).toBe(2);
  });

  test('can be converted to array', () => {
    const queue = new AsyncQueue();

    queue.add(111);
    queue.add(222);

    expect(Array.from(queue)).toEqual([111, 222]);
  });

  test('taken values are removed from the queue', async () => {
    const queue = new AsyncQueue();

    queue.add(111);
    queue.add(222);

    await queue.take();

    expect(Array.from(queue)).toEqual([222]);
  });
});
