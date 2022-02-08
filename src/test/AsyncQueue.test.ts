import {AsyncQueue} from '../main';

describe('Queue', () => {

  test('takes an existing element', (done) => {
    const q = new AsyncQueue();

    q.add(111);

    q.take().then((value) => {
      expect(value).toBe(111);
      done();
    });
  });

  test('takes an added element', (done) => {
    const q = new AsyncQueue();

    q.take().then((value) => {
      expect(value).toBe(111);
      done();
    });

    q.add(111);
  });

  test('takes an ack for an existing element', (done) => {
    const q = new AsyncQueue();

    q.add(111);

    q.takeAck().then((ack) => {
      expect(ack()).toBe(111);
      done();
    });
  });

  test('takes an ack for an added element', (done) => {
    const q = new AsyncQueue();

    q.takeAck().then((ack) => {
      expect(ack()).toBe(111);
      done();
    });

    q.add(111);
  });

  test('ack is revoked if unused', (done) => {
    const q = new AsyncQueue();

    q.add(111);

    q.takeAck().then((ack) => ack).then((ack) => {
      expect(() => ack()).toThrow();
      done();
    });
  });

  test('sequential ack is revoked if unused', (done) => {
    const q = new AsyncQueue();

    q.add(111);
    q.add(222);

    q.takeAck();

    q.takeAck().then((ack) => ack).then((ack) => {
      expect(() => ack()).toThrow();
      done();
    });
  });

  test('sequential taker receives an value from the unused ack', (done) => {
    const q = new AsyncQueue();

    q.add(111);

    q.takeAck(); // Ack is ignored and revoked

    q.takeAck().then((ack) => {
      expect(ack()).toBe(111);
      done();
    });
  });

  test('ack is not revoked if used', (done) => {
    const q = new AsyncQueue();

    q.add(111);

    q.takeAck().then((ack) => {
      ack();
      return ack;
    }).then((ack) => {
      expect(ack()).toBe(111);
      done();
    });
  });

  test('acks are provided in fifo order', async () => {
    const consumerMock = jest.fn();
    const q = new AsyncQueue();

    const promise1 = q.takeAck().then((ack) => {
      consumerMock(ack());
    });

    const promise2 = q.takeAck().then((ack) => {
      consumerMock(ack());
    });

    q.add(111);
    q.add(222);

    await promise1;

    expect(consumerMock).toHaveBeenCalledTimes(1);
    expect(consumerMock).toHaveBeenNthCalledWith(1, 111);

    await promise2;

    expect(consumerMock).toHaveBeenCalledTimes(2);
    expect(consumerMock).toHaveBeenNthCalledWith(2, 222);
  });

  test('returns the size of the queue', () => {
    const q = new AsyncQueue();

    q.add(111);
    q.add(222);

    expect(q.size).toBe(2);
  });

  test('can be converted to array', () => {
    const q = new AsyncQueue();

    q.add(111);
    q.add(222);

    expect(Array.from(q)).toEqual([111, 222]);
  });

  test('taken elements are removed from the queue', async () => {
    const q = new AsyncQueue();

    q.add(111);
    q.add(222);

    await q.take();

    expect(Array.from(q)).toEqual([222]);
  });
});
