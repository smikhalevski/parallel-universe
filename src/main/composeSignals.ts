/**
 * Returns a signal that is aborted when any of given signals is aborted.
 *
 * @param signals The signals to observe.
 */
export function composeSignals(signals: AbortSignal[]): AbortSignal {
  const abortController = new AbortController();

  const abortListener = () => {
    for (const signal of signals) {
      signal.removeEventListener('abort', abortListener);
    }
    abortController.abort();
  };

  for (const signal of signals) {
    if (signal.aborted) {
      abortListener();
      break;
    }
    signal.addEventListener('abort', abortListener);
  }
  return abortController.signal;
}
