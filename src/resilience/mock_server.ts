/**
 * In-memory Mock HTTP Server & Network Interceptor for Integration Testing.
 */

export interface MockRoute {
  method: string;
  urlPattern: RegExp;
  handler: (req: Request) => Promise<Response>;
}

export class MockHttpServer {
  private routes: MockRoute[] = [];
  private requestHistory: Request[] = [];

  public on(method: string, pattern: RegExp | string, handler: (req: Request) => Promise<Response>) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    this.routes.push({ method: method.toUpperCase(), urlPattern: regex, handler });
  }

  public async handle(req: Request): Promise<Response> {
    this.requestHistory.push(req);
    for (const route of this.routes) {
      if (route.method === req.method.toUpperCase() && route.urlPattern.test(req.url)) {
        return route.handler(req);
      }
    }
    return new Response('Not Found', { status: 404 });
  }

  public getHistory(): Request[] {
    return this.requestHistory;
  }

  public reset() {
    this.routes = [];
    this.requestHistory = [];
  }
}
