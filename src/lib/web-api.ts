import { HttpServer, RouteHandle } from './http-server.js';
import { Input, Logger } from './log.js';
import { Duplex } from 'stream';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { Tree } from './tree.js';
import WebSocket from 'ws';
import { multiline } from './string.js';

const PATH_HIERARCHY = '/api/hierarchy' as const;
const PATH_ID = '/api/id' as const;
const PATH_STREAM = '/api/stream' as const;
const PATH_VALUES = '/api/values' as const;

export class WebApi {
  private readonly _httpServer: HttpServer;
  private readonly _id: string;
  private readonly _log: Input;
  private readonly _tree: Tree;
  private readonly _wss: WebSocket.Server;

  constructor(logger: Logger, httpServer: HttpServer, id: string, tree: Tree) {
    this._tree = tree;
    this._httpServer = httpServer;
    this._id = id;
    this._log = logger.getInput({ head: 'WebApi' });
    this._wss = new WebSocket.Server({ noServer: true });

    this._httpServer.route(PATH_HIERARCHY, (handle) =>
      this._handleHierarchyGet(handle)
    );

    this._httpServer.route(PATH_ID, ({ response }) =>
      response.end(this._id.toString())
    );

    this._httpServer.route(PATH_STREAM, (handle) =>
      this._handleStreamGet(handle)
    );

    this._httpServer.route(PATH_VALUES, (handle) =>
      this._handleValuesGet(handle)
    );

    this._httpServer.server.on('upgrade', (request, socket, head) =>
      this._handleStreamUpgrade(request, socket, head)
    );

    this._wss.on('connection', (ws) => this._handleStream(ws));
  }

  private _handleHierarchyGet({ response, url, utils }: RouteHandle) {
    if (utils.constrainMethod('GET')) return;

    if (url.searchParams.get('id') !== this._id) {
      response.writeHead(400, 'Bad request');
      response.end(multiline`
        400 Bad request
        The client didn\'t supply the correct "id" query parameter.
      `);

      return;
    }

    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(this._tree.structure));
  }

  private _handleStream(ws: WebSocket) {
    try {
      for (const entry of this._tree.values()) {
        ws.send(JSON.stringify(entry));
      }

      const observer = this._tree.stream.observe((entry) => {
        if (!entry) return;

        ws.send(JSON.stringify(entry));
      });

      ws.on('message', (data) => {
        const payload = (() => {
          if (typeof data !== 'string') return null;

          try {
            return JSON.parse(data);
          } catch {
            return null;
          }
        })();

        if (!payload || !Array.isArray(payload) || payload.length < 2) return;

        const [index, value] = payload;

        this._tree.set(index, value);
      });

      ws.on('close', () => {
        observer.remove();
        ws.close();
      });
    } catch (_error) {
      const error = new Error(`error handling WebSocket: ${_error}`);

      this._log.error(() => error.stack as string);

      ws.close();
    }
  }

  private _handleStreamGet({ response, url, utils }: RouteHandle) {
    if (utils.constrainMethod('GET')) return;

    if (url.searchParams.get('id') !== this._id) {
      response.writeHead(400, 'Bad request');
      response.end(multiline`
        400 Bad request
        The client didn\'t supply the correct "id" query parameter.
      `);

      return;
    }

    response.writeHead(426, 'Upgrade required');
    response.end(multiline`
      426 Upgrade required
      The client should repeat the request using the "websocket" protocol.
    `);
  }

  private _handleStreamUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ) {
    if (!request.url) return;

    const url = this._httpServer.requestUrl(request);

    if (url.pathname !== PATH_STREAM) {
      socket.destroy();

      return;
    }

    if (url.searchParams.get('id') !== this._id) {
      socket.destroy();

      return;
    }

    if (!(socket instanceof Socket)) {
      socket.destroy();

      return;
    }

    this._wss.handleUpgrade(request, socket, head, (ws) =>
      this._wss.emit('connection', ws, request)
    );
  }

  private _handleValuesGet({ response, url, utils }: RouteHandle) {
    if (utils.constrainMethod('GET')) return;

    if (url.searchParams.get('id') !== this._id) {
      response.writeHead(400, 'Bad request');
      response.end(multiline`
        400 Bad request
        The client didn\'t supply the correct "id" query parameter.
      `);

      return;
    }

    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(this._tree.values()));
  }
}
