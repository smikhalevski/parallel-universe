import {repeat} from '../main';

describe('repeat', () => {

  it('resolves with promise', () => {
    expect(repeat(() => 1, () => true)).toBeInstanceOf(Promise);
  });

  it('resolves with callback result', async () => {
    await expect(repeat(() => 'foo', () => true)).resolves.toBe('foo');
  });

  it('invokes until condition is met', async () => {
    let i = 0;

    const until = jest.fn(() => ++i === 3);
    const result = await repeat(() => 'foo', until);

    expect(until).toHaveBeenCalledTimes(3);
    expect(result).toBe('foo');
  });
});
