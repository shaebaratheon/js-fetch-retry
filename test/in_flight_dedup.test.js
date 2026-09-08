const assert = require('assert');
const { InFlightDeduplicator } = require('../lib/in_flight_dedup');

describe('InFlightDeduplicator', () => {
  it('should coalesce identical concurrent requests', async () => {
    const dedup = new InFlightDeduplicator();
    let counter = 0;
    const task = () => new Promise(res => {
      counter++;
      setTimeout(() => res('done'), 20);
    });

    const [r1, r2] = await Promise.all([
      dedup.execute('user:1', task),
      dedup.execute('user:1', task)
    ]);

    assert.strictEqual(r1, 'done');
    assert.strictEqual(r2, 'done');
    assert.strictEqual(counter, 1);
    assert.strictEqual(dedup.activeCount(), 0);
  });
});
