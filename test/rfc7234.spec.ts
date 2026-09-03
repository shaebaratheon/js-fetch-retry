import { RFC7234Parser } from '../src/cache/rfc7234_validator';

describe('RFC 7234 Cache Control Parser', () => {
  it('correctly parses complex cache-control headers', () => {
    const header = 'public, max-age=3600, must-revalidate';
    const directives = RFC7234Parser.parseCacheControl(header);

    expect(directives.public).toBe(true);
    expect(directives.maxAge).toBe(3600);
    expect(directives.mustRevalidate).toBe(true);
    expect(directives.noStore).toBe(false);
  });

  it('determines response freshness window accurately', () => {
    const now = Date.now();
    expect(RFC7234Parser.isFresh(now - 10000, 60)).toBe(true);
    expect(RFC7234Parser.isFresh(now - 70000, 60)).toBe(false);
  });
});
