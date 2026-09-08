const assert = require('assert');
const { RetryPredicate } = require('../lib/retry_predicate');

describe('RetryPredicate', () => {
  it('should retry on 503 and 429', () => {
    assert.strictEqual(RetryPredicate.defaultPredicate(null, { status: 503 }), true);
    assert.strictEqual(RetryPredicate.defaultPredicate(null, { status: 429 }), true);
  });

  it('should not retry on 404 or 200', () => {
    assert.strictEqual(RetryPredicate.defaultPredicate(null, { status: 200 }), false);
    assert.strictEqual(RetryPredicate.defaultPredicate(null, { status: 404 }), false);
  });

  it('should support custom predicates', () => {
    const custom = RetryPredicate.createCustom((err, res) => res && res.status === 418);
    assert.strictEqual(custom(null, { status: 418 }), true);
    assert.strictEqual(custom(null, { status: 500 }), false);
  });
});
