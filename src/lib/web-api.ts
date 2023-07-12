import { HttpServer, RouteHandle } from './http-server.js';
import { Input, Logger, callstack } from './log.js';
import {
  InteractionUpdate,
  Serialization,
} from './tree/operations/serialization.js';
import WebSocket, { WebSocketServer } from 'ws';
import { Duplex } from 'node:stream';
import { Element } from './tree/main.js';
import { IncomingMessage } from 'node:http';
import { Observable } from './observable.js';
import { Socket } from 'node:net';
import { Timer } from './timer.js';
import { multiline } from './string.js';
import { objectKeys } from './oop.js';
import { v5 as uuidv5 } from 'uuid';

const WEB_API_UUID_NAMESPACE = 'c4218bec-e940-4d68-8807-5c43b2aee27b' as const;

const PATH_HIERARCHY = '/api/hierarchy';
const PATH_ID = '/api/id';
const PATH_STREAM = '/api/stream';
const PATH_VALUES = '/api/values';

const WEBSOCKET_PING_INTERVAL = 5000;
const websocketMarcopoloPayload = uuidv5('marcopolo', WEB_API_UUID_NAMESPACE);

export class WebApi {
  private readonly _hierarchy: string;
  private readonly _id: string;
  private readonly _log: Input;
  private readonly _streamCount: Observable<number>;
  private readonly _wss: WebSocketServer;

  constructor(
    logger: Logger,
    private readonly _httpServer: HttpServer,
    private readonly _serialization: Serialization<Element>
  ) {
    this._log = logger.getInput({ head: this.constructor.name });
    this._wss = new WebSocketServer({ noServer: true });
    this._hierarchy = JSON.stringify(_serialization.tree);
    this._id = uuidv5(this._hierarchy, WEB_API_UUID_NAMESPACE);
    this._streamCount = new Observable(0);

    this._httpServer.route(PATH_HIERARCHY, (handle) =>
      this._handleHierarchyGet(handle)
    );

    this._httpServer.route(PATH_ID, ({ response }) => {
      response.end(this._id);
    });

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
      response.end(
        multiline`
          400 Bad request
          The client didn\'t supply the correct "id" query parameter.
        `()
      );

      return;
    }

    response.setHeader('Content-Type', 'application/json');
    response.end(this._hierarchy);
  }

  private _handleStream(ws: WebSocket) {
    try {
      const values = this._serialization.values;
      for (const key of objectKeys(values)) {
        const value = values[key];
        ws.send(JSON.stringify([key, value]));
      }

      const streamCountObserver = this._streamCount.observe((value) => {
        ws.send(JSON.stringify([-1, value]));
      });

      const observer = this._serialization.updates.observe((entry) => {
        if (!entry) return;

        ws.send(JSON.stringify(entry));
      });

      this._streamCount.value = this._serialization.updates.listeners;

      const pingPong = setInterval(() => ws.ping(), WEBSOCKET_PING_INTERVAL);
      const pingPongTimer = new Timer(WEBSOCKET_PING_INTERVAL * 5);

      ws.on('message', (data) => {
        if (data.toString() === websocketMarcopoloPayload) {
          ws.send(websocketMarcopoloPayload);

          return;
        }

        const payload = (() => {
          if (typeof data !== 'string') return null;

          try {
            return JSON.parse(data);
          } catch {
            return null;
          }
        })();

        if (!payload || !Array.isArray(payload) || payload.length < 2) return;

        try {
          this._serialization.inject(payload as InteractionUpdate);
        } catch {
          // noop
        }
      });

      ws.on('pong', () => {
        pingPongTimer.start();
      });

      const handleStreamClose = () => {
        clearInterval(pingPong);
        pingPongTimer.stop();

        streamCountObserver.remove();
        observer.remove();

        this._streamCount.value = this._serialization.updates.listeners;

        ws.close();
      };

      ws.on('close', handleStreamClose);
      pingPongTimer.observe(handleStreamClose);
    } catch (_error) {
      const error = new Error('cannot handle WebSocket', { cause: _error });

      this._log.error(() => error.message, callstack(error));

      ws.close();
    }
  }

  private _handleStreamGet({ response, url, utils }: RouteHandle) {
    if (utils.constrainMethod('GET')) return;

    if (url.searchParams.get('id') !== this._id) {
      response.writeHead(400, 'Bad request');
      response.end(
        multiline`
          400 Bad request
          The client didn\'t supply the correct "id" query parameter.
        `()
      );

      return;
    }

    response.writeHead(426, 'Upgrade required');
    response.end(
      multiline`
        426 Upgrade required
        The client should repeat the request using the "websocket" protocol.
      `()
    );
  }

  private _handleStreamUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ) {
    if (!request.url) return;

    const url = this._httpServer.requestUrl(request.url);

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
      response.end(
        multiline`
          400 Bad request
          The client didn\'t supply the correct "id" query parameter.
        `()
      );

      return;
    }

    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify(
        Object.fromEntries(
          Object.entries(this._serialization.values).map(
            ([key, observable]) => [key, observable.value] as const
          )
        )
      )
    );
  }
}
