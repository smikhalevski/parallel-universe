import {untilDefined} from '../main';

describe('untilDefined', () => {

  test('waits until returned value is defined', async () => {
    let value: number | undefined;

    const promise = untilDefined<number>(() => value);

    value = 123;

    await expect(promise).resolves.toBe(123);
  });
});
