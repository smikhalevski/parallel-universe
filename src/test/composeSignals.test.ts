import { composeSignals } from '../main';

describe('composeSignals', () => {
  test('aborts if any of signals is aborted', () => {
    const abortController1 = new AbortController();
    const abortController2 = new AbortController();

    const signal = composeSignals([abortController1.signal, abortController2.signal]);

    expect(signal.aborted).toBe(false);

    abortController2.abort();

    expect(signal.aborted).toBe(true);
  });

  test('returns aborted signal if any of input signals are aborted', () => {
    const abortController1 = new AbortController();
    const abortController2 = new AbortController();

    abortController2.abort();

    const signal = composeSignals([abortController1.signal, abortController2.signal]);

    expect(signal.aborted).toBe(true);
  });
});
