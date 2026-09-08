'use strict';

class CompositeAbortSignal {
  static any(signals) {
    const controller = new AbortController();
    for (const signal of signals) {
      if (!signal) continue;
      if (signal.aborted) {
        controller.abort(signal.reason);
        return controller.signal;
      }
      signal.addEventListener('abort', () => {
        controller.abort(signal.reason);
      }, { once: true });
    }
    return controller.signal;
  }
}

module.exports = { CompositeAbortSignal };
