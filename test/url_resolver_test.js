/**
 * Unit Tests for URL Resolution, SSRF Protection, and Redirect Tracking.
 */

const assert = require("assert");
const { UrlResolver, RedirectLoopError, SecurityPolicyError } = require("../lib/url_resolver");

function runResolverTests() {
  console.log("Running UrlResolver unit tests...");

  const resolver = new UrlResolver({ maxRedirects: 3 });

  // Test 1: URL query param sorting
  {
    const norm = resolver.normalizeUrl("https://example.com/api?b=2&a=1");
    assert.strictEqual(norm, "https://example.com/api?a=1&b=2");
    console.log("  [PASS] URL normalization and query sorting");
  }

  // Test 2: SSRF block private IPs
  {
    assert.throws(() => resolver.validateDestination("http://127.0.0.1/admin"), SecurityPolicyError);
    assert.throws(() => resolver.validateDestination("http://169.254.169.254/latest/meta-data"), SecurityPolicyError);
    assert.throws(() => resolver.validateDestination("http://192.168.1.1/router"), SecurityPolicyError);
    assert.strictEqual(resolver.validateDestination("https://api.github.com/events"), true);
    console.log("  [PASS] SSRF protection against private IP ranges");
  }

  // Test 3: Redirect loop detection
  {
    const tracker = resolver.createRedirectTracker();
    tracker.recordHop("https://example.com/step1");
    tracker.recordHop("https://example.com/step2");
    assert.throws(() => {
      tracker.recordHop("https://example.com/step1");
    }, RedirectLoopError);
    console.log("  [PASS] Cyclic redirect loop detection");
  }

  // Test 4: Maximum hop limit
  {
    const tracker = resolver.createRedirectTracker();
    tracker.recordHop("https://example.com/hop1");
    tracker.recordHop("https://example.com/hop2");
    tracker.recordHop("https://example.com/hop3");
    assert.throws(() => {
      tracker.recordHop("https://example.com/hop4");
    }, RedirectLoopError);
    console.log("  [PASS] Max redirect hops limit enforcement");
  }

  console.log("All UrlResolver tests passed successfully!");
}

try {
  runResolverTests();
} catch (err) {
  console.error("Resolver test failure:", err);
  process.exit(1);
}
