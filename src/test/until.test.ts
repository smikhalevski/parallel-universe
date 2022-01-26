import {Deferred, until} from '../main';

describe('until', () => {

  it('waits until returned value is defined', () => {
    const deferred = new Deferred<number>();

    const p = until<number>(() => deferred.promise);

    deferred.resolve(123);

    expect(p).resolves.toBe(123);
  });
});
