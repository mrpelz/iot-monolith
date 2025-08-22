import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { Duplex } from 'node:stream';

import { Observable } from '@mrpelz/observable';
import { Timer } from '@mrpelz/observable/timer';
import { stripIndent } from 'proper-tags';
import webSocket, { WebSocketServer } from 'ws';

import { HttpServer, RouteHandle } from '../http-server.js';
import { callstack, Input, Logger } from '../log.js';
import {
  InteractionUpdate,
  Serialization,
} from '../tree/operations/serialization.js';

export const WEB_API_UUID = 'c4218bec-e940-4d68-8807-5c43b2aee27b';

const PATH_HIERARCHY = '/api/hierarchy';
const PATH_STREAM = '/api/stream';
const PATH_VALUES = '/api/values';

const WEBSOCKET_PING_INTERVAL = 5000;

export class WebApi {
  private readonly _hierarchy: string;
  private readonly _log: Input;
  private readonly _streamCount: Observable<number>;
  private readonly _wss: WebSocketServer;

  constructor(
    logger: Logger,
    private readonly _httpServer: HttpServer,
    private readonly _serialization: Serialization<object>,
  ) {
    this._log = logger.getInput({ head: this.constructor.name });
    this._wss = new WebSocketServer({ noServer: true });
    this._hierarchy = JSON.stringify(_serialization.tree);
    this._streamCount = new Observable(0);

    this._httpServer.route(PATH_HIERARCHY, (handle) =>
      this._handleHierarchyGet(handle),
    );

    this._httpServer.route(PATH_STREAM, (handle) =>
      this._handleStreamGet(handle),
    );

    this._httpServer.route(PATH_VALUES, (handle) =>
      this._handleValuesGet(handle),
    );

    this._httpServer.server.on('upgrade', (request, socket, head) =>
      this._handleStreamUpgrade(request, socket, head),
    );

    this._wss.on('connection', (ws, request) =>
      this._handleStream(ws, request),
    );
  }

  private _handleHierarchyGet({ response, utils }: RouteHandle) {
    if (utils.constrainMethod('GET')) return;

    response.setHeader('Content-Type', 'application/json');
    response.end(this._hierarchy);
  }

  private _handleStream(ws: webSocket, request: IncomingMessage) {
    if (!request.url) return;

    const url = this._httpServer.requestUrl(request.url);
    const countConnection = url.searchParams.get('count') !== '0';

    try {
      const { updates } = this._serialization;

      const streamCountObserver = this._streamCount.observe((value) => {
        ws.send(JSON.stringify([WEB_API_UUID, value]));
      });

      const observer = updates.observe((entry) => {
        if (!entry) return;

        ws.send(JSON.stringify(entry));
      });

      if (countConnection) this._streamCount.value += 1;

      const pingPong = setInterval(() => ws.ping(), WEBSOCKET_PING_INTERVAL);
      const pingPongTimer = new Timer(WEBSOCKET_PING_INTERVAL * 5);

      ws.on('message', (data) => {
        const data_ = data.toString();

        if (data_ === WEB_API_UUID) {
          ws.send(WEB_API_UUID);

          return;
        }

        const payload = (() => {
          if (typeof data_ !== 'string') return null;

          try {
            return JSON.parse(data_);
          } catch {
            return null;
          }
        })();

        if (!payload || !Array.isArray(payload) || payload.length < 2) return;

        try {
          this._serialization.inject(payload as InteractionUpdate);
        } catch (error) {
          this._log.error(() => error.message, callstack(error));
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

        if (countConnection) {
          this._streamCount.value -= Math.max(0, this._streamCount.value - 1);
        }

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

  private _handleStreamGet({ response, utils }: RouteHandle) {
    if (utils.constrainMethod('GET')) return;

    response.writeHead(426, 'Upgrade required');
    response.end(
      stripIndent`
        426 Upgrade required
        The client should repeat the request using the "websocket" protocol.
      `,
    );
  }

  private _handleStreamUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ) {
    if (!request.url) return;

    const url = this._httpServer.requestUrl(request.url);

    if (url.pathname !== PATH_STREAM) return;

    if (!(socket instanceof Socket)) {
      socket.destroy();

      return;
    }

    this._wss.handleUpgrade(request, socket, head, (ws) =>
      this._wss.emit('connection', ws, request),
    );
  }

  private _handleValuesGet({ response, utils }: RouteHandle) {
    if (utils.constrainMethod('GET')) return;

    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify({
        [WEB_API_UUID]: this._streamCount.value,
        ...Object.fromEntries(
          Array.from(this._serialization.interactions).map(
            ([key, interaction]) => [key, interaction.state.value] as const,
          ),
        ),
      }),
    );
  }
}
