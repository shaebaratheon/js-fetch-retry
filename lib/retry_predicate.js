'use strict';

class RetryPredicate {
  static defaultPredicate(error, response) {
    if (error) return true;
    if (!response) return false;
    // Retry on standard transient status codes
    const transientStatuses = [408, 429, 500, 502, 503, 504];
    return transientStatuses.includes(response.status);
  }

  static createCustom(fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('Predicate must be a function');
    }
    return (error, response) => Boolean(fn(error, response));
  }
}

module.exports = { RetryPredicate };
