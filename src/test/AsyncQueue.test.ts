import { AsyncQueue, delay } from '../main';

describe('AsyncQueue', () => {
  test('takes an existing value', async () => {
    const queue = new AsyncQueue();

    queue.append(111);

    await expect(queue.take()).resolves.toBe(111);
  });

  test('takes an appended value', async () => {
    const queue = new AsyncQueue();

    const promise = queue.take();

    queue.append(111);

    await expect(promise).resolves.toBe(111);
  });

  test('taken value is removed from the queue', async () => {
    const queue = new AsyncQueue();

    queue.append(111);
    queue.append(222);

    await queue.take();

    expect(Array.from(queue)).toEqual([222]);
  });

  test('aborted take does not remove the value from the queue', async () => {
    const queue = new AsyncQueue();

    queue.append(111);

    const promise = queue.take();

    promise.abort();

    await expect(promise).rejects.toEqual(new DOMException('', 'AbortError'));

    expect(queue['_resolveTake']).toBeUndefined();
    expect(Array.from(queue)).toEqual([111]);
  });

  test('abort is noop if take is resolved', async () => {
    const queue = new AsyncQueue();

    queue.append(111);

    const promise = queue.take();

    await promise;

    promise.abort();

    await expect(promise).resolves.toBe(111);

    expect(queue.size).toBe(0);
  });

  test('takes an ack for an existing value', async () => {
    const queue = new AsyncQueue();

    queue.append(111);

    const [value, ack] = await queue.takeAck();

    expect(queue['_resolveTake']).toBeUndefined();
    expect(value).toBe(111);
    expect(ack).toBeInstanceOf(Function);
  });

  test('takes an ack for an appended value', async () => {
    const queue = new AsyncQueue();

    const promise = queue.takeAck();

    queue.append(111);

    const [value, ack] = await promise;

    expect(value).toBe(111);
    expect(ack).toBeInstanceOf(Function);
  });

  test('calling an ack removes the value from the queue', async () => {
    const queue = new AsyncQueue();

    queue.append(111);

    await queue.takeAck().then(([, ack]) => {
      ack(true);
    });

    expect(queue.size).toBe(0);
  });

  test('acks are provided in fifo order', async () => {
    const consumerMock = jest.fn();
    const queue = new AsyncQueue();

    const promise1 = queue.takeAck().then(([value, ack]) => {
      ack(true);
      consumerMock(value);
    });

    const promise2 = queue.takeAck().then(([value, ack]) => {
      ack(true);
      consumerMock(value);
    });

    queue.append(111);
    queue.append(222);

    await promise1;

    expect(consumerMock).toHaveBeenCalledTimes(1);
    expect(consumerMock).toHaveBeenNthCalledWith(1, 111);

    await promise2;

    expect(consumerMock).toHaveBeenCalledTimes(2);
    expect(consumerMock).toHaveBeenNthCalledWith(2, 222);
  });

  test('aborted take of an existing value is ignored', async () => {
    const queue = new AsyncQueue();

    queue.append(111);

    const promise1 = queue.takeAck();
    const promise2 = queue.takeAck();

    promise1.abort();

    const [value] = await promise2;

    await expect(promise1).rejects.toEqual(new DOMException('', 'AbortError'));
    expect(value).toBe(111);
  });

  test('aborted take of an appended value is ignored', async () => {
    const queue = new AsyncQueue();

    const promise1 = queue.takeAck();
    const promise2 = queue.takeAck();

    await delay(50);

    promise1.abort();

    queue.append(111);

    const [value] = await promise2;

    await expect(promise1).rejects.toEqual(new DOMException('', 'AbortError'));
    expect(value).toBe(111);
  });

  test('aborted take of a taken value is ignored', async () => {
    const queue = new AsyncQueue();

    const promise = queue.takeAck();

    promise.then(([, ack]) => {
      promise.abort();
      ack(true);
    });

    queue.append(111);

    await promise;

    expect(queue.size).toBe(0);
  });

  test('returns the size of the queue', () => {
    const queue = new AsyncQueue();

    queue.append(111);
    queue.append(222);

    expect(queue.size).toBe(2);
  });

  test('can be converted to array', () => {
    const queue = new AsyncQueue();

    queue.append(111);
    queue.append(222);

    expect(Array.from(queue)).toEqual([111, 222]);
  });
});
