'use strict';

class InFlightDeduplicator {
  constructor() {
    this.inFlight = new Map();
  }

  execute(key, factory) {
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }
    const promise = Promise.resolve().then(() => factory()).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, promise);
    return promise;
  }

  activeCount() {
    return this.inFlight.size;
  }
}

module.exports = { InFlightDeduplicator };
