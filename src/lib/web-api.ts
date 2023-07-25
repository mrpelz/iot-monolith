import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { Duplex } from 'node:stream';

import { XMLSerializer } from '@oozcitak/dom';
import { DOMImplementation } from '@oozcitak/dom/lib/dom/index.js';
import {
  Element as XMLElement,
  XMLDocument,
} from '@oozcitak/dom/lib/dom/interfaces.js';
import { stripIndent } from 'proper-tags';
import { v5 as uuidv5 } from 'uuid';
import WebSocket, { WebSocketServer } from 'ws';

import { HttpServer, RouteHandle } from './http-server.js';
import { callstack, Input, Logger } from './log.js';
import { Observable } from './observable.js';
import { Timer } from './timer.js';
import { Element, Level, ValueType } from './tree/main.js';
import {
  InteractionReference,
  InteractionType,
  InteractionUpdate,
  isInteractionReference,
  Serialization,
  TElementSerialization,
} from './tree/operations/serialization.js';

enum TreeMode {
  REFERENCE,
  VALUE,
}

const WEB_API_UUID_NAMESPACE = 'c4218bec-e940-4d68-8807-5c43b2aee27b' as const;

const PATH_HIERARCHY = '/api/hierarchy';
const PATH_ID = '/api/id';
const PATH_STREAM = '/api/stream';
const PATH_TREE = '/api/tree';
const PATH_VALUES = '/api/values';

const WEBSOCKET_PING_INTERVAL = 5000;

const stringLevel = {
  [Level.NONE]: 'NONE',
  [Level.SYSTEM]: 'SYSTEM',
  [Level.HOME]: 'HOME',
  [Level.BUILDING]: 'BUILDING',
  [Level.FLOOR]: 'FLOOR',
  [Level.ROOM]: 'ROOM',
  [Level.AREA]: 'AREA',
  [Level.DEVICE]: 'DEVICE',
  [Level.PROPERTY]: 'PROPERTY',
  [Level.ELEMENT]: 'ELEMENT',
} as const;

const stringValueType = {
  [ValueType.BOOLEAN]: 'BOOLEAN',
  [ValueType.NULL]: 'NULL',
  [ValueType.NUMBER]: 'NUMBER',
  [ValueType.RAW]: 'RAW',
  [ValueType.STRING]: 'STRING',
} as const;

const websocketMarcopoloPayload = uuidv5('marcopolo', WEB_API_UUID_NAMESPACE);

const dom = new DOMImplementation();
const xmlSerializer = new XMLSerializer();

export class WebApi {
  private readonly _document: Record<TreeMode, XMLDocument> = {
    [TreeMode.REFERENCE]: dom.createDocument(null, 'root'),
    [TreeMode.VALUE]: dom.createDocument(null, 'root'),
  };

  private readonly _hierarchy: string;
  private readonly _id: string;
  private readonly _log: Input;
  private readonly _streamCount: Observable<number>;
  private readonly _wss: WebSocketServer;

  constructor(
    logger: Logger,
    private readonly _httpServer: HttpServer,
    private readonly _serialization: Serialization<Element>,
  ) {
    this._log = logger.getInput({ head: this.constructor.name });
    this._wss = new WebSocketServer({ noServer: true });
    this._hierarchy = JSON.stringify(_serialization.tree);
    this._id = uuidv5(this._hierarchy, WEB_API_UUID_NAMESPACE);
    this._streamCount = new Observable(0);

    this._populateTree(TreeMode.REFERENCE, this._document[TreeMode.REFERENCE]);
    this._populateTree(TreeMode.VALUE, this._document[TreeMode.VALUE]);

    this._httpServer.route(PATH_HIERARCHY, (handle) =>
      this._handleHierarchyGet(handle),
    );

    this._httpServer.route(PATH_ID, ({ response }) => {
      response.end(this._id);
    });

    this._httpServer.route(PATH_STREAM, (handle) =>
      this._handleStreamGet(handle),
    );

    this._httpServer.route(PATH_TREE, (handle) => this._handleTreeGet(handle));

    this._httpServer.route(PATH_VALUES, (handle) =>
      this._handleValuesGet(handle),
    );

    this._httpServer.server.on('upgrade', (request, socket, head) =>
      this._handleStreamUpgrade(request, socket, head),
    );

    this._wss.on('connection', (ws) => this._handleStream(ws));
  }

  private _appendTreeInteractionReference(
    parent: XMLElement,
    { reference, type }: InteractionReference,
  ) {
    parent.setAttribute('species', 'interaction');

    parent.setAttribute(
      'direction',
      type === InteractionType.EMIT ? 'emit' : 'collect',
    );

    parent.setAttribute('reference', reference);
  }

  private _appendTreeInteractionValue(
    document: XMLDocument,
    parent: XMLElement,
    { reference }: InteractionReference,
  ) {
    const { state } = this._serialization.interactions.get(reference) ?? {};
    if (!state) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleValue = (value: any) => {
      while (parent.firstChild) {
        // eslint-disable-next-line unicorn/prefer-dom-node-remove
        parent.removeChild(parent.firstChild);
      }

      if (value === undefined) return;
      this._appendTreePrimitive(document, parent, value);
    };

    handleValue(state.value);
    state.observe((value) => handleValue(value));
  }

  private _appendTreeMap(
    mode: TreeMode,
    document: XMLDocument,
    parent: XMLElement,
    input: Record<string, TElementSerialization>,
  ) {
    for (const key of Object.keys(input).sort()) {
      const { [key]: value } = input;

      this._appendTreeMapElement(mode, document, parent, key, value);
    }
  }

  private _appendTreeMapElement(
    mode: TreeMode,
    document: XMLDocument,
    parent: XMLElement,
    key: string,
    value: TElementSerialization,
  ) {
    // if (key === '$' && typeof value === 'string') {
    //   parent.setAttribute('species', value);

    //   return;
    // }

    if (key === 'level' && typeof value === 'number' && value in stringLevel) {
      parent.setAttribute(
        'level',
        stringLevel[value as keyof typeof stringLevel],
      );

      return;
    }

    if (
      key === 'valueType' &&
      typeof value === 'number' &&
      value in stringValueType
    ) {
      parent.setAttribute(
        'valueType',
        stringValueType[value as keyof typeof stringValueType],
      );

      return;
    }

    if (typeof value !== 'object') {
      parent.setAttribute(key === '$' ? 'species' : key, value.toString());

      return;
    }

    const element = document.createElement(key === '$' ? '_' : key);

    this._createTreeElement(mode, document, element, value);
    parent.append(element);
  }

  private _appendTreePrimitive(
    document: XMLDocument,
    parent: XMLElement,
    input: boolean | null | number | string,
  ) {
    const type = input === null ? 'null' : typeof input;

    if (type === 'object') return;
    if (type === 'bigint') return;
    if (type === 'function') return;
    if (type === 'symbol') return;
    if (type === 'undefined') return;

    parent.setAttribute('type', type);

    const text = (() => {
      switch (type) {
        case 'boolean': {
          return input ? 'true' : 'false';
        }
        case 'null': {
          return 'null';
        }
        case 'number': {
          return JSON.stringify(input);
        }
        case 'string': {
          return input as string;
        }
        default: {
          return undefined;
        }
      }
    })();

    if (text === undefined) return;

    parent.append(document.createTextNode(text));
  }

  private _createTreeElement(
    mode: TreeMode,
    document: XMLDocument,
    parent: XMLElement,
    element: TElementSerialization,
  ) {
    if (element === null || typeof element !== 'object') {
      this._appendTreePrimitive(document, parent, element);

      return;
    }

    if (isInteractionReference(element)) {
      this._appendTreeInteractionReference(parent, element);

      if (mode === TreeMode.VALUE) {
        this._appendTreeInteractionValue(document, parent, element);
      }

      return;
    }

    this._appendTreeMap(mode, document, parent, element);
  }

  private _handleHierarchyGet({ response, url, utils }: RouteHandle) {
    if (utils.constrainMethod('GET')) return;

    if (url.searchParams.get('id') !== this._id) {
      response.writeHead(400, 'Bad request');
      response.end(
        stripIndent`
          400 Bad request
          The client didn\'t supply the correct "id" query parameter.
        `,
      );

      return;
    }

    response.setHeader('Content-Type', 'application/json');
    response.end(this._hierarchy);
  }

  private _handleStream(ws: WebSocket) {
    try {
      const { interactions, updates } = this._serialization;

      for (const key of interactions.keys()) {
        const value = interactions.get(key);
        if (value === undefined) continue;

        ws.send(JSON.stringify([key, value]));
      }

      const streamCountObserver = this._streamCount.observe((value) => {
        ws.send(JSON.stringify([-1, value]));
      });

      const observer = updates.observe((entry) => {
        if (!entry) return;

        ws.send(JSON.stringify(entry));
      });

      this._streamCount.value = updates.listeners;

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

        this._streamCount.value = updates.listeners;

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
        stripIndent`
          400 Bad request
          The client didn\'t supply the correct "id" query parameter.
        `,
      );

      return;
    }

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
      this._wss.emit('connection', ws, request),
    );
  }

  private _handleTreeGet({ response, url, utils }: RouteHandle) {
    if (utils.constrainMethod('GET')) return;

    if (url.searchParams.get('id') !== this._id) {
      response.writeHead(400, 'Bad request');
      response.end(
        stripIndent`
          400 Bad request
          The client didn\'t supply the correct "id" query parameter.
        `,
      );

      return;
    }

    const mode = url.searchParams.has('values')
      ? TreeMode.VALUE
      : TreeMode.REFERENCE;

    const document = this._document[mode];

    try {
      response.setHeader('Content-Type', 'application/xml');
      response.end(xmlSerializer.serializeToString(document));
    } catch (error) {
      throw new Error('could not serialize tree', { cause: error });
    }
  }

  private _handleValuesGet({ response, url, utils }: RouteHandle) {
    if (utils.constrainMethod('GET')) return;

    if (url.searchParams.get('id') !== this._id) {
      response.writeHead(400, 'Bad request');
      response.end(
        stripIndent`
          400 Bad request
          The client didn\'t supply the correct "id" query parameter.
        `,
      );

      return;
    }

    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify(
        Object.fromEntries(
          Array.from(this._serialization.interactions.entries()).map(
            ([key, interaction]) => [key, interaction.state.value] as const,
          ),
        ),
      ),
    );
  }

  private _populateTree(mode: TreeMode, document: XMLDocument) {
    if (!document.documentElement) return;

    try {
      this._createTreeElement(
        mode,
        document,
        document.documentElement,
        this._serialization.tree,
      );
    } catch (error) {
      this._log.error(() => error, callstack(error));
    }
  }
}
