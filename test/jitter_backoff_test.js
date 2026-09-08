'use strict';

const assert = require('assert');
const { calculateFullJitterDelay } = require('../lib/jitter_backoff');

describe('Full Jitter Exponential Backoff', () => {
  it('should generate delays within valid mathematical bounds', () => {
    const base = 50;
    const max = 800;

    for (let attempt = 0; attempt < 10; attempt++) {
      const delay = calculateFullJitterDelay(attempt, { baseDelayMs: base, maxDelayMs: max });
      const maxPossible = Math.min(max, base * Math.pow(2, attempt));
      assert.ok(delay >= 0, `Delay ${delay} should be >= 0`);
      assert.ok(delay <= maxPossible, `Delay ${delay} should be <= ${maxPossible}`);
    }
  });

  it('should respect upper ceiling maxDelayMs', () => {
    for (let i = 0; i < 50; i++) {
      const delay = calculateFullJitterDelay(20, { baseDelayMs: 100, maxDelayMs: 500 });
      assert.ok(delay <= 500, `Delay ${delay} must never exceed maxDelayMs 500`);
    }
  });
});
