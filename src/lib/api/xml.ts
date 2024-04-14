import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { Duplex } from 'node:stream';

import { DOMParser, XMLSerializer } from '@oozcitak/dom';
import {
  DOMImplementation,
  Element as XMLElementImpl,
} from '@oozcitak/dom/lib/dom/index.js';
import {
  Element as XMLElement,
  XMLDocument,
} from '@oozcitak/dom/lib/dom/interfaces.js';
import { stripIndent } from 'proper-tags';
import { v5 as uuidv5 } from 'uuid';
import webSocket, { WebSocketServer } from 'ws';

import { jsonParseGuarded } from '../data.js';
import { HttpServer, RouteHandle } from '../http-server.js';
import { callstack, Input, Logger } from '../log.js';
import { Observable } from '../observable.js';
import { EmptyObject, objectKeys } from '../oop.js';
import { Timer } from '../timer.js';
import {
  descriptionValueType,
  Element,
  isValueType,
  Level,
  TValueType,
  ValueType,
  valueTypeDescription,
} from '../tree/main.js';
import {
  InteractionReference,
  InteractionType,
  InteractionUpdate,
  isInteractionReference,
  Serialization,
  TElementSerialization,
} from '../tree/operations/serialization.js';
import { WEB_API_UUID } from './main.js';

enum HierarchyMode {
  REFERENCE,
  VALUE,
}

const PATH_HIERARCHY = '/api/xml/hierarchy';
const PATH_STREAM = '/api/xml/stream';
const PATH_VALUES = '/api/xml/values';

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

const websocketMarcopoloPayload = uuidv5('marcopolo', WEB_API_UUID);

const dom = new DOMImplementation();
const xmlSerializer = new XMLSerializer();
const xmlParser = new DOMParser();

export class WebApiXML {
  private static _parsePrimitiveElement(
    element: XMLElement,
  ): unknown | undefined;

  private static _parsePrimitiveElement(
    element: XMLElement,
  ): unknown | undefined;

  private static _parsePrimitiveElement<T extends ValueType = ValueType>(
    element: XMLElement,
    expectedType: T,
  ): TValueType[T] | undefined;

  private static _parsePrimitiveElement<T extends ValueType = ValueType>(
    element: XMLElement,
    expectedType?: T,
  ): TValueType[T] | unknown | undefined {
    const type = element.getAttribute('type') as
      | keyof typeof descriptionValueType
      | null;
    if (!type || !objectKeys(descriptionValueType).includes(type)) {
      return undefined;
    }

    const { textContent } = element;
    if (textContent === null) return undefined;

    const parsedContent =
      type === 'string'
        ? textContent
        : jsonParseGuarded<EmptyObject>(textContent);

    if (parsedContent === undefined || parsedContent instanceof Error) {
      return undefined;
    }

    if (
      !isValueType(parsedContent, expectedType ?? descriptionValueType[type])
    ) {
      return undefined;
    }

    if (expectedType && type !== valueTypeDescription[expectedType]) {
      return undefined;
    }

    return parsedContent;
  }

  private readonly _documentValue = dom.createDocument(null, 'root');
  private readonly _hierarchy: string;
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
    this._streamCount = new Observable(0);

    const documentReference = dom.createDocument(null, 'root');

    this._populateHierarchy(HierarchyMode.REFERENCE, documentReference);
    this._hierarchy = xmlSerializer.serializeToString(documentReference);

    this._populateHierarchy(HierarchyMode.VALUE, this._documentValue);

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

    this._wss.on('connection', (ws) => this._handleStream(ws));
  }

  private _appendHierarchyInteractionReference(
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

  private _appendHierarchyInteractionValue(
    document: XMLDocument,
    parent: XMLElement,
    { reference }: InteractionReference,
  ) {
    const { state } = this._serialization.interaction(reference) ?? {};
    if (!state) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleValue = (value: any) => {
      while (parent.firstChild) {
        // eslint-disable-next-line unicorn/prefer-dom-node-remove
        parent.removeChild(parent.firstChild);
      }

      if (value === undefined) return;
      this._appendHierarchyPrimitive(document, parent, value);
    };

    handleValue(state.value);
    state.observe((value) => handleValue(value));
  }

  private _appendHierarchyMap(
    mode: HierarchyMode,
    document: XMLDocument,
    parent: XMLElement,
    input: Record<string, TElementSerialization>,
  ) {
    for (const key of Object.keys(input).sort()) {
      const { [key]: value } = input;

      this._appendHierarchyMapElement(mode, document, parent, key, value);
    }
  }

  private _appendHierarchyMapElement(
    mode: HierarchyMode,
    document: XMLDocument,
    parent: XMLElement,
    key: string,
    value: TElementSerialization,
  ) {
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

    this._createHierarchyElement(mode, document, element, value);
    parent.append(element);
  }

  private _appendHierarchyPrimitive(
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

  private _createHierarchyElement(
    mode: HierarchyMode,
    document: XMLDocument,
    parent: XMLElement,
    element: TElementSerialization,
  ) {
    if (element === null || typeof element !== 'object') {
      this._appendHierarchyPrimitive(document, parent, element);

      return;
    }

    if (isInteractionReference(element)) {
      this._appendHierarchyInteractionReference(parent, element);

      if (mode === HierarchyMode.VALUE) {
        this._appendHierarchyInteractionValue(document, parent, element);
      }

      return;
    }

    this._appendHierarchyMap(mode, document, parent, element);
  }

  private _createPrimitiveElement(
    document: XMLDocument,
    tagName: string,
    value: boolean | null | number | string,
    attributes?: Record<string, string>,
  ) {
    const element = document.createElement(tagName);

    for (const [key, attributeValue] of Object.entries(attributes ?? {})) {
      element.setAttribute(key, attributeValue);
    }

    this._appendHierarchyPrimitive(document, element, value);

    return element;
  }

  private _handleHierarchyGet({ response, url, utils }: RouteHandle) {
    if (utils.constrainMethod('GET')) return;

    try {
      const xml = url.searchParams.has('values')
        ? xmlSerializer.serializeToString(this._documentValue)
        : this._hierarchy;

      response.setHeader('Content-Type', 'application/xml');
      response.end(xml);
    } catch (error) {
      throw new Error('could not serialize tree', { cause: error });
    }
  }

  private _handleStream(ws: webSocket) {
    try {
      const { updates } = this._serialization;

      const streamCountObserver = this._streamCount.observe((value) => {
        const update = this._createPrimitiveElement(
          this._documentValue,
          'stream-count',
          value,
        );

        ws.send(xmlSerializer.serializeToString(update));
      });

      const observer = updates.observe((interaction) => {
        if (!interaction) return;

        const [key, value] = interaction;

        const update = this._createPrimitiveElement(
          this._documentValue,
          'update',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <any>value,
          { reference: key },
        );

        ws.send(xmlSerializer.serializeToString(update));
      });

      this._streamCount.value += 1;

      const pingPong = setInterval(() => ws.ping(), WEBSOCKET_PING_INTERVAL);
      const pingPongTimer = new Timer(WEBSOCKET_PING_INTERVAL * 5);

      ws.on('message', (data) => {
        if (data.toString() === websocketMarcopoloPayload) {
          ws.send(websocketMarcopoloPayload);

          return;
        }

        const payload = (() => {
          if (typeof data !== 'string') return undefined;

          try {
            const root = xmlParser
              .parseFromString(data, 'application/xml')
              .getRootNode();

            if (!(root instanceof XMLElementImpl)) return undefined;
            if (root.tagName !== 'input') return undefined;

            const key = root.getAttribute('reference');
            if (!key) return undefined;

            const value = WebApiXML._parsePrimitiveElement(root);

            return [key, value] as const;
          } catch {
            return undefined;
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

        this._streamCount.value -= 1;

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

    try {
      const parent = this._documentValue.createElement('values');

      for (const [key, interaction] of this._serialization.interactions) {
        const {
          state: { value },
        } = interaction;

        if (value === undefined) continue;

        parent.append(
          this._createPrimitiveElement(
            this._documentValue,
            'entry',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <any>value,
            { reference: key },
          ),
        );
      }

      response.setHeader('Content-Type', 'application/xml');
      response.end(xmlSerializer.serializeToString(parent));
    } catch (error) {
      throw new Error('could not serialize values', { cause: error });
    }
  }

  private _populateHierarchy(mode: HierarchyMode, document: XMLDocument) {
    if (!document.documentElement) return;

    try {
      this._createHierarchyElement(
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
