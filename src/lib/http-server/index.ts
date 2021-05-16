import { IncomingMessage, Server, ServerResponse } from 'http';

export type RouteHandler = (
  response: ServerResponse,
  request: IncomingMessage,
  url: URL
) => Promise<ServerResponse> | ServerResponse;

export type Route = {
  remove: () => void;
};

export class HttpServer {
  private _routes = new Map<string, RouteHandler>();
  private _server: Server;

  constructor() {
    this._server = new Server((...args) => this._handleRequest(...args));
  }

  private _handleRequest(request: IncomingMessage, response: ServerResponse) {
    if (!request.url) return;

    const url = new URL(request.url);

    const handler = this._routes.get(url.pathname);
    if (!handler) return;

    handler(response, request, url);
  }

  close(): void {
    this._server.close();
  }

  listen(port: number): void {
    this._server.listen(port, 'localhost');
  }

  route(path: string, handler: RouteHandler): Route {
    if (this._routes.has(path)) {
      throw new Error(`route with path "${path}" already set`);
    }

    this._routes.set(path, handler);

    return {
      remove: () => {
        this._routes.delete(path);
      },
    };
  }
}
