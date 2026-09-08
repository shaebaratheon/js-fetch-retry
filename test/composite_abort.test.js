const assert = require('assert');
const { CompositeAbortSignal } = require('../lib/composite_abort');

describe('CompositeAbortSignal', () => {
  it('should trigger when one of signals aborts', () => {
    const c1 = new AbortController();
    const c2 = new AbortController();
    const composite = CompositeAbortSignal.any([c1.signal, c2.signal]);

    assert.strictEqual(composite.aborted, false);
    c2.abort('user cancellation');
    assert.strictEqual(composite.aborted, true);
    assert.strictEqual(composite.reason, 'user cancellation');
  });
});
