import { Topic } from '../main';

describe('Topic', () => {
  test('takes an existing value', async () => {
    const topic = new Topic();

    topic.add(111);

    await expect(topic.take()).resolves.toBe(111);
  });

  test('takes an added value', async () => {
    const topic = new Topic();

    const promise = topic.take();

    topic.add(111);

    await expect(promise).resolves.toBe(111);
  });

  test('takes an ack for an existing value', async () => {
    const topic = new Topic();

    topic.add(111);

    const [value, ack] = await topic.takeAck();

    expect(value).toBe(111);
    expect(ack).toBeInstanceOf(Function);
  });

  test('takes an ack for an added value', async () => {
    const topic = new Topic();

    const promise = topic.takeAck();

    topic.add(111);

    const [value, ack] = await promise;

    expect(value).toBe(111);
    expect(ack).toBeInstanceOf(Function);
  });

  test('calling an ack removes the value from the topic', async () => {
    const topic = new Topic();

    topic.add(111);

    await topic.takeAck().then(([, ack]) => {
      ack();
    });

    expect(topic.size).toBe(0);
  });

  test('ack is revoked if on next tick', async () => {
    const topic = new Topic();

    topic.add(111);

    const ack = await topic.takeAck().then(([, ack]) => ack);

    expect(ack).toThrow();
    expect(topic.size).toBe(1);
  });

  test('sequential ack is revoked if unused', async () => {
    const topic = new Topic();

    topic.add(111);
    topic.add(222);

    topic.takeAck().then(([, ack]) => {
      ack();
    });

    const ack = await topic.takeAck().then(([, ack]) => ack);

    expect(ack).toThrow();
    expect(topic.size).toBe(1);
  });

  test('blocking ack is not revoked', async () => {
    const topic = new Topic();

    topic.add(111);

    const ack = await topic.takeBlockingAck().then(([, ack]) => ack);

    ack();

    expect(topic.size).toBe(0);
  });

  test('unused ack passed to the next consumer', async () => {
    const topic = new Topic();

    topic.add(111);

    topic.takeAck(); // Unused ack is revoked

    const [value] = await topic.takeAck();

    expect(value).toBe(111);
  });

  test('ack is not revoked if used', async () => {
    const topic = new Topic();

    topic.add(111);

    const ack = await topic.takeAck().then(([, ack]) => {
      ack();
      return ack;
    });

    expect(ack).not.toThrow();
  });

  test('acks are provided in fifo order', async () => {
    const consumerMock = jest.fn();
    const topic = new Topic();

    const promise1 = topic.takeAck().then(([value, ack]) => {
      ack();
      consumerMock(value);
    });

    const promise2 = topic.takeAck().then(([value, ack]) => {
      ack();
      consumerMock(value);
    });

    topic.add(111);
    topic.add(222);

    await promise1;

    expect(consumerMock).toHaveBeenCalledTimes(1);
    expect(consumerMock).toHaveBeenNthCalledWith(1, 111);

    await promise2;

    expect(consumerMock).toHaveBeenCalledTimes(2);
    expect(consumerMock).toHaveBeenNthCalledWith(2, 222);
  });

  test('returns the size of the topic', () => {
    const topic = new Topic();

    topic.add(111);
    topic.add(222);

    expect(topic.size).toBe(2);
  });

  test('can be converted to array', () => {
    const topic = new Topic();

    topic.add(111);
    topic.add(222);

    expect(Array.from(topic)).toEqual([111, 222]);
  });

  test('taken values are removed from the topic', async () => {
    const topic = new Topic();

    topic.add(111);
    topic.add(222);

    await topic.take();

    expect(Array.from(topic)).toEqual([222]);
  });
});
