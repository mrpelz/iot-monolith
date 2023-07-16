import { IncomingMessage, Server, ServerResponse } from 'node:http';
import { Input, Logger, callstack } from './log.js';
import { stripIndent } from 'common-tags';

export type RouteUtils = {
  badRequest: (body?: string) => void;
  constrainMethod: (method: string | string[], body?: string) => boolean;
  internalServerError: (body?: string) => void;
  notFound: (body?: string) => void;
  requestBody: () => Promise<Buffer>;
};

export type RouteHandle = {
  request: IncomingMessage;
  response: ServerResponse;
  url: URL;
  utils: RouteUtils;
};

export type RouteHandler = (handle: RouteHandle) => void | Promise<void>;

export type Route = {
  remove: () => void;
};

export class HttpServer {
  static badRequest(response: ServerResponse, body?: string): void {
    response.writeHead(400, 'Bad request');

    response.end(
      stripIndent`
        400 Bad request
        The request could not be understood by the server due to malformed syntax.

        ${body || ''}
      `
    );
  }

  static constrainMethod(
    allowedMethod: string | string[],
    response: ServerResponse,
    { method }: IncomingMessage,
    body?: string
  ): boolean {
    const allowedMethods = [allowedMethod].flat();

    if (method && !allowedMethods.includes(method)) {
      response.writeHead(405, 'Method not allowed');

      response.end(
        stripIndent`
          405 Method not allowed
          The resource was requested using a method that is not allowed.

          This resource is only available via these methods:
          ${allowedMethods.join(', ')}

          ${body || ''}
        `
      );

      return true;
    }

    return false;
  }

  static internalServerError(response: ServerResponse, body?: string): void {
    response.writeHead(500, 'Internal server error');

    response.end(
      stripIndent`
        500 Internal server error

        ${body || ''}
      `
    );
  }

  static notFound(response: ServerResponse, body?: string): void {
    response.writeHead(404, 'Not found');

    response.end(
      stripIndent`
        404 Not found
        The resource could not be found.

        ${body || ''}
      `
    );
  }

  static requestBody(request: IncomingMessage): Promise<Buffer> {
    return new Promise<Buffer>((resolve) => {
      const body: Buffer[] = [];

      request.on('data', (chunk) => body.push(chunk));
      request.on('end', () => resolve(Buffer.concat(body)));
    });
  }

  private readonly _log: Input;
  private readonly _port: number;
  private readonly _routes = new Map<string, RouteHandler>();

  readonly server: Server;

  constructor(logger: Logger, port: number) {
    this._log = logger.getInput({ head: this.constructor.name });
    this._port = port;

    this.server = new Server();
    this.server.on('request', (request, response) =>
      this._handleRequest(request, response)
    );

    this.route('/favicon.ico', ({ response }) => HttpServer.notFound(response));
  }

  private _handleRequest(request: IncomingMessage, response: ServerResponse) {
    const { url: requestUrl } = request;
    if (!requestUrl) return;

    const utils: RouteUtils = {
      badRequest: (body) => HttpServer.badRequest(response, body),
      constrainMethod: (method, body) =>
        HttpServer.constrainMethod(method, response, request, body),
      internalServerError: (body) =>
        HttpServer.internalServerError(response, body),
      notFound: (body) => HttpServer.notFound(response, body),
      requestBody: () => HttpServer.requestBody(request),
    };

    try {
      const url = this.requestUrl(requestUrl);

      const handler = this._routes.get(url.pathname);

      if (!handler) {
        this._log.notice(() => `${url.href}: 404`);

        utils.notFound();

        return;
      }

      handler({
        request,
        response,
        url,
        utils,
      });
    } catch (_error) {
      const error = new Error('error handling request', { cause: _error });

      this._log.error(() => error.message, callstack(error));

      utils.internalServerError(error.message);
    }
  }

  close(): void {
    this.server.close();

    this._log.info(() => 'close');
  }

  listen(): void {
    this.server.listen(this._port);

    this._log.info(() => `listen on port ${this._port}`);
  }

  requestUrl(url: string): URL {
    const result = new URL(url, `http://[::]:${this._port}/`);

    const { pathname } = result;
    if (pathname !== '/' && pathname.endsWith('/')) {
      result.pathname = pathname.slice(0, -1);
    }

    return result;
  }

  route(path: string, handler: RouteHandler): Route {
    const { pathname } = this.requestUrl(path);

    if (this._routes.has(pathname)) {
      const error = new Error(`route with path "${pathname}" already set`);

      this._log.error(() => error.message, callstack(error));

      throw error;
    }

    this._routes.set(pathname, handler);

    return {
      remove: () => {
        this._routes.delete(pathname);
      },
    };
  }
}
