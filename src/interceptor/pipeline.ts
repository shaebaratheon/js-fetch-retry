/**
 * Onion-model Middleware & Interceptor Pipeline for HTTP requests and responses.
 */

export type RequestContext = {
  url: string;
  options: RequestInit;
  metadata: Record<string, any>;
  attempt: number;
};

export type ResponseContext = {
  response?: Response;
  error?: Error;
  durationMs: number;
};

export type NextFunction = (ctx: RequestContext) => Promise<Response>;

export type Interceptor = (ctx: RequestContext, next: NextFunction) => Promise<Response>;

export class InterceptorPipeline {
  private interceptors: Interceptor[] = [];

  public use(interceptor: Interceptor): this {
    this.interceptors.push(interceptor);
    return this;
  }

  public async execute(context: RequestContext, finalFetch: NextFunction): Promise<Response> {
    let index = -1;

    const dispatch = async (i: number, currentCtx: RequestContext): Promise<Response> => {
      if (i <= index) {
        throw new Error('next() called multiple times within interceptor');
      }
      index = i;
      const fn = this.interceptors[i] || finalFetch;
      if (!fn) {
        throw new Error('Pipeline execution exhausted with no response');
      }
      return fn(currentCtx, (nextCtx) => dispatch(i + 1, nextCtx));
    };

    return dispatch(0, context);
  }
}
