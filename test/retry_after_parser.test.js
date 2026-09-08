const assert = require('assert');
const { parseRetryAfter } = require('../lib/retry_after_parser');

describe('parseRetryAfter', () => {
  it('should parse integer seconds into milliseconds', () => {
    assert.strictEqual(parseRetryAfter('120'), 120000);
    assert.strictEqual(parseRetryAfter('0'), 0);
  });

  it('should parse valid HTTP date', () => {
    const now = 1000000;
    const futureDate = new Date(now + 30000).toUTCString();
    const delay = parseRetryAfter(futureDate, now);
    assert.strictEqual(delay, 30000);
  });

  it('should return null on invalid values', () => {
    assert.strictEqual(parseRetryAfter('invalid-header'), null);
    assert.strictEqual(parseRetryAfter(''), null);
  });
});
