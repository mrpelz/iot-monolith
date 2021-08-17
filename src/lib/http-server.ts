import { IncomingMessage, Server, ServerResponse } from 'http';
import { Input, Logger } from './log.js';
import { multiline } from './string.js';

const HOST = 'localhost' as const;

export type RouteUtils = {
  constrainMethod: (method: string, body?: string) => boolean;
  internalServerError: (body?: string) => void;
  notFound: (body?: string) => void;
};

export type RouteHandle = {
  request: IncomingMessage;
  response: ServerResponse;
  url: URL;
  utils: RouteUtils;
};

export type RouteHandler = (handle: RouteHandle) => void;

export type Route = {
  remove: () => void;
};

export class HttpServer {
  static constrainMethod(
    method: string,
    response: ServerResponse,
    request: IncomingMessage,
    body?: string
  ): boolean {
    if (request.method !== method) {
      response.writeHead(405, 'Method not allowed');
      const message = multiline`
        405 Method not allowed
        The resource was requested using a method that is not allowed.
        This resource is only available via method "${method}".
      `;

      response.end(
        body
          ? multiline`
            ${message}
            ${body}
          `
          : message
      );

      return true;
    }

    return false;
  }

  static internalServerError(response: ServerResponse, body?: string): void {
    response.writeHead(500, 'Internal server error');

    const message = '500 Internal server error';

    response.end(
      body
        ? multiline`
          ${message}
          ${body}
        `
        : message
    );
  }

  static notFound(response: ServerResponse, body?: string): void {
    response.writeHead(404, 'Not found');

    const message = multiline`
      404 Not found
      The resource could not be found.
    `;

    response.end(
      body
        ? multiline`
          ${message}
          ${body}
        `
        : message
    );
  }

  private readonly _log: Input;
  private readonly _port: number;
  private readonly _routes = new Map<string, RouteHandler>();

  readonly server: Server;

  constructor(logger: Logger, port: number) {
    this._log = logger.getInput({ head: 'HttpServer' });
    this._port = port;

    this.server = new Server();
    this.server.on('request', (request, response) =>
      this._handleRequest(request, response)
    );

    this.route('/favicon.ico', ({ response }) => HttpServer.notFound(response));
  }

  private _handleRequest(request: IncomingMessage, response: ServerResponse) {
    const utils: RouteUtils = {
      constrainMethod: (method, body) =>
        HttpServer.constrainMethod(method, response, request, body),
      internalServerError: (body) =>
        HttpServer.internalServerError(response, body),
      notFound: (body) => HttpServer.notFound(response, body),
    };

    try {
      const url = this.requestUrl(request);

      const handler = this._routes.get(url.pathname);

      if (!handler) {
        this._log.notice(() => `${url}: 404`);

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
      const error = new Error(`error handling request: ${_error}`);

      this._log.error(() => error.message);

      utils.internalServerError(error.message);
    }
  }

  close(): void {
    this.server.close();

    this._log.info(() => 'close');
  }

  listen(): void {
    this.server.listen(this._port, HOST);

    this._log.info(() => `listen on ${HOST}:${this._port}`);
  }

  requestUrl(request: IncomingMessage): URL {
    return new URL(request.url || '/', `http://${HOST}:${this._port}/`);
  }

  route(path: string, handler: RouteHandler): Route {
    if (this._routes.has(path)) {
      const error = new Error(`route with path "${path}" already set`);

      this._log.error(() => error.message);

      throw error;
    }

    this._routes.set(path, handler);

    return {
      remove: () => {
        this._routes.delete(path);
      },
    };
  }
}