/**
 * URL Normalization, Redirect Chain Tracking, and SSRF Guard.
 */

class RedirectLoopError extends Error {
  constructor(message, chain = []) {
    super(message);
    this.name = "RedirectLoopError";
    this.chain = chain;
  }
}

class SecurityPolicyError extends Error {
  constructor(message) {
    super(message);
    this.name = "SecurityPolicyError";
  }
}

class UrlResolver {
  /**
   * @param {Object} options
   * @param {number} options.maxRedirects - Maximum allowed hops (default: 5)
   * @param {boolean} options.allowPrivateIps - Whether private IP destinations are allowed
   */
  constructor(options = {}) {
    this.maxRedirects = options.maxRedirects || 5;
    this.allowPrivateIps = options.allowPrivateIps || false;
  }

  normalizeUrl(rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      parsed.searchParams.sort();
      return parsed.toString();
    } catch (err) {
      throw new TypeError(`Invalid URL format: ${rawUrl}`);
    }
  }

  isPrivateHost(hostname) {
    if (this.allowPrivateIps) {
      return false;
    }
    // Check localhost
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return true;
    }
    // Check 10.0.0.0/8
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }
    // Check 172.16.0.0/12
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }
    // Check 192.168.0.0/16
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }
    // Check 169.254.0.0/16 (link-local / AWS metadata)
    if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }
    return false;
  }

  validateDestination(url) {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new SecurityPolicyError(`Unsupported protocol: ${parsed.protocol}`);
    }
    if (this.isPrivateHost(parsed.hostname)) {
      throw new SecurityPolicyError(`Access to private IP range is blocked: ${parsed.hostname}`);
    }
    return true;
  }

  createRedirectTracker() {
    const chain = [];
    const seen = new Set();
    const max = this.maxRedirects;
    const resolver = this;

    return {
      recordHop(targetUrl) {
        const normalized = resolver.normalizeUrl(targetUrl);
        resolver.validateDestination(normalized);

        if (seen.has(normalized)) {
          throw new RedirectLoopError(`Cyclic redirect loop detected: ${normalized}`, chain);
        }
        if (chain.length >= max) {
          throw new RedirectLoopError(`Exceeded maximum redirect limit of ${max} hops`, chain);
        }

        seen.add(normalized);
        chain.push(normalized);
        return normalized;
      },
      getHops() {
        return [...chain];
      }
    };
  }
}

module.exports = {
  UrlResolver,
  RedirectLoopError,
  SecurityPolicyError
};
