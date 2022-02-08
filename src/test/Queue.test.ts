import {Queue} from '../main/Queue';

describe('Queue', () => {

  test('takes an existing element', (done) => {
    const q = new Queue();

    q.add(111);

    q.take().then((value) => {
      expect(value).toBe(111);
      done();
    });
  });

  test('takes an added element', (done) => {
    const q = new Queue();

    q.take().then((value) => {
      expect(value).toBe(111);
      done();
    });

    q.add(111);
  });

  test('takes an ack for an existing element', (done) => {
    const q = new Queue();

    q.add(111);

    q.takeAck().then((ack) => {
      expect(ack()).toBe(111);
      done();
    });
  });

  test('takes an ack for an added element', (done) => {
    const q = new Queue();

    q.takeAck().then((ack) => {
      expect(ack()).toBe(111);
      done();
    });

    q.add(111);
  });

  test('ack is revoked if unused', (done) => {
    const q = new Queue();

    q.add(111);

    q.takeAck().then((ack) => ack).then((ack) => {
      expect(ack()).toBeUndefined();
      done();
    });
  });

  test('sequential ack is revoked if unused', (done) => {
    const q = new Queue();

    q.add(111, 222);

    q.takeAck();

    q.takeAck().then((ack) => ack).then((ack) => {
      expect(ack()).toBeUndefined();
      done();
    });
  });

  test('ack is not revoked if used', (done) => {
    const q = new Queue();

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
    const q = new Queue();

    const promise1 = q.takeAck().then((ack) => {
      consumerMock(ack());
    });

    const promise2 = q.takeAck().then((ack) => {
      consumerMock(ack());
    });

    q.add(111, 222);

    await promise1;

    expect(consumerMock).toHaveBeenCalledTimes(1);
    expect(consumerMock).toHaveBeenNthCalledWith(1, 111);

    await promise2;

    expect(consumerMock).toHaveBeenCalledTimes(2);
    expect(consumerMock).toHaveBeenNthCalledWith(2, 222);
  });
});
