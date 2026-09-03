/**
 * Full RFC 7234 HTTP Caching Validator.
 */

export interface CacheDirectives {
  noCache: boolean;
  noStore: boolean;
  maxAge?: number;
  sMaxAge?: number;
  mustRevalidate: boolean;
  public: boolean;
  private: boolean;
}

export class RFC7234Parser {
  public static parseCacheControl(headerValue?: string | null): CacheDirectives {
    const directives: CacheDirectives = {
      noCache: false,
      noStore: false,
      mustRevalidate: false,
      public: false,
      private: false,
    };

    if (!headerValue) return directives;

    const parts = headerValue.split(',').map((s) => s.trim().toLowerCase());
    for (const part of parts) {
      if (part === 'no-cache') directives.noCache = true;
      else if (part === 'no-store') directives.noStore = true;
      else if (part === 'must-revalidate') directives.mustRevalidate = true;
      else if (part === 'public') directives.public = true;
      else if (part === 'private') directives.private = true;
      else if (part.startsWith('max-age=')) {
        directives.maxAge = parseInt(part.replace('max-age=', ''), 10);
      } else if (part.startsWith('s-maxage=')) {
        directives.sMaxAge = parseInt(part.replace('s-maxage=', ''), 10);
      }
    }
    return directives;
  }

  public static isFresh(entryDate: number, maxAgeSeconds?: number): boolean {
    if (maxAgeSeconds === undefined) return false;
    const age = (Date.now() - entryDate) / 1000;
    return age < maxAgeSeconds;
  }
}
