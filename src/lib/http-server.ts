import { IncomingMessage, Server, ServerResponse } from 'http';
import { Input, Logger } from './log.js';

export type RouteHandler = (
  response: ServerResponse,
  request: IncomingMessage,
  url: URL
) => Promise<ServerResponse> | ServerResponse;

export type Route = {
  remove: () => void;
};

export class HttpServer {
  private readonly _log: Input;
  private readonly _port: number;
  private readonly _routes = new Map<string, RouteHandler>();

  readonly server: Server;

  constructor(logger: Logger, port: number) {
    this._log = logger.getInput({ head: 'http-server' });
    this._port = port;

    this.server = new Server((...args) => this._handleRequest(...args));
  }

  private _handleRequest(request: IncomingMessage, response: ServerResponse) {
    if (!request.url) return;

    const url = new URL(request.url);

    const handler = this._routes.get(url.pathname);

    if (!handler) {
      this._log.notice(() => `${url}: 404`);

      response.writeHead(
        404,
        '404 Not found\nThe resource could not be found.'
      );

      return;
    }

    handler(response, request, url);
  }

  close(): void {
    this.server.close();

    this._log.info(() => 'close');
  }

  listen(): void {
    this.server.listen(this._port, 'localhost');

    this._log.info(() => `listen on localhost:${this._port}`);
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
