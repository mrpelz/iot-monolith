/* eslint-disable sort-keys */

import {
  BooleanGroupStrategy,
  BooleanState,
  BooleanStateGroup,
  NullState,
  ReadOnlyNullState,
} from '../state.js';
import { DynamicBuffer, MappedDynamicStruct } from '../struct/dynamic.js';
import {
  FixedBuffer,
  MappedStruct,
  StaticBuffer,
  UInt8,
  staticValue,
} from '../struct/main.js';
import { Input, Logger } from '../log.js';
import { Observer, ReadOnlyObservable } from '../observable.js';
import { Transport, TransportDevice } from '../transport/main.js';
import { NUMBER_RANGES } from '../number.js';
import { RollingNumber } from '../rolling-number.js';
import { TCPDevice } from './tcp.js';
import { TCPTransport } from '../transport/tcp.js';
import { Timer } from '../timer.js';
import { UDPDevice } from './udp.js';
import { UDPTransport } from '../transport/udp.js';
import { emptyBuffer } from '../data.js';

export type IpDevice = TCPDevice | UDPDevice;

type DeviceEvents = Set<Event<unknown>>;
type DeviceServices = Set<Service<unknown, unknown>>;

type Request<T = Buffer> = Promise<T>;

type RequestResolver = <T extends boolean = boolean>(
  success: T,
  result: T extends true ? Buffer : Error
) => void;

type DeviceIdentifier = Buffer | null;

const VERSION = 2;
const DEFAULT_TIMEOUT = 1000;

const KEEPALIVE_COMMAND = 0xff;
const KEEPALIVE_INTERVAL = 1000;
const KEEPALIVE_TOLERATE_MISSED_PACKETS = 2;

const RESET_PAYLOAD = Buffer.of(0xff, VERSION, KEEPALIVE_COMMAND, 0, 1);

const headerIncoming = new MappedStruct({
  identifier: new UInt8(),
});

const payloadOutgoing = new MappedDynamicStruct({
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  header: new MappedStruct({
    requestIdentifier: new UInt8(),
    version: staticValue(VERSION, new UInt8()),
  }),
  message: new DynamicBuffer(),
});

export const EVENT_IDENTIFIER = 0x00;

export class Property {
  static isValidPropertyIdentifier(
    properties: DeviceServices | DeviceEvents,
    identifier: Buffer
  ): void {
    for (const previousProperty of properties) {
      if (previousProperty.identifier.equals(identifier)) {
        throw new Error(
          `cannot use the same identifier for multiple properties (${identifier})`
        );
      }
    }
  }

  protected _device: Device | null;

  readonly identifier: Buffer;

  constructor(identifier: Buffer) {
    this.identifier = identifier;
  }

  /**
   * get device online state
   */
  get isOnline(): ReadOnlyObservable<boolean> {
    if (!this._device) {
      throw new Error('no device is present on this property');
    }

    return this._device.isOnline;
  }

  _setDevice(device: Device): void {
    if (this._device) {
      throw new Error('device is already set');
    }

    this._device = device;
  }
}

export class Event<T = void> extends Property {
  private readonly _header: MappedStruct<{ identifier: StaticBuffer }>;
  private readonly _observable = new NullState<T>();

  readonly observable: ReadOnlyNullState<T>;

  constructor(identifier: Buffer) {
    super(identifier);

    this._header = new MappedStruct({
      identifier: new StaticBuffer(identifier.length),
    });

    this.observable = new ReadOnlyNullState<T>(this._observable);
  }

  protected decode(input: Buffer): T | null {
    if (!input.length) return null;
    return input as unknown as T;
  }

  /**
   * ingest event from Device instance
   */
  ingest(input: Buffer): void {
    const [{ identifier }, eventPayload] = this._header.decodeOpenended(input);
    if (!identifier.equals(this.identifier)) return;

    const eventData = this.decode(eventPayload);
    if (eventData === null) return;

    this._observable.trigger(eventData);
  }
}

export class Service<T = void, S = void> extends Property {
  private readonly _headerOutgoing: MappedDynamicStruct<{
    identifier: FixedBuffer;
    message: DynamicBuffer;
  }>;

  private readonly _timeout: number;

  constructor(_identifier: Buffer, timeout = DEFAULT_TIMEOUT) {
    const identifier =
      _identifier.length <= 1
        ? Buffer.of(_identifier.at(0) || 0, 0)
        : _identifier;

    super(identifier);

    this._headerOutgoing = new MappedDynamicStruct({
      identifier: staticValue(identifier, new StaticBuffer(identifier.length)),
      message: new DynamicBuffer(),
    });

    this._timeout = timeout;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected decode(_input: Buffer): T | null {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected encode(_input: S): Buffer {
    return emptyBuffer;
  }

  /**
   * issue request on Device instance
   */
  request(
    data: S,
    suppressErrors = false,
    ignoreOffline = false
  ): Request<T | null> {
    if (!this._device) {
      throw new Error('no device is present on this property');
    }

    return this._device
      .request(
        this._headerOutgoing.encode({
          message: this.encode(data),
        }),
        this._timeout,
        suppressErrors,
        ignoreOffline
      )
      .then((result) => this.decode(result));
  }
}

export class Device<T extends Transport = Transport> {
  private readonly _events = new Set<Event<unknown>>();
  private readonly _isOnline = new BooleanState(false);
  private readonly _keepalive?: Service<void, void>;
  private _keepaliveMissedPackets = 0;
  private readonly _keepaliveTolerateMissedPackets: number;
  private readonly _log: Input;

  private readonly _requestIdentifier = new RollingNumber(
    ...NUMBER_RANGES.uint[1],
    [EVENT_IDENTIFIER]
  );

  private readonly _requests = new Map<number, RequestResolver>();
  private readonly _seen = new NullState();
  private readonly _services = new Set<Service<unknown, unknown>>();
  private readonly _transport: TransportDevice;

  readonly identifier: DeviceIdentifier;
  readonly isOnline: ReadOnlyObservable<boolean>;
  readonly seen: ReadOnlyNullState;
  readonly transport: T;

  constructor(
    logger: Logger,
    transport: T,
    identifier: DeviceIdentifier = null,
    keepalive = true,
    keepaliveTolerateMissedPackets = KEEPALIVE_TOLERATE_MISSED_PACKETS
  ) {
    this.transport = transport;
    this.identifier = identifier;

    this._log = logger.getInput({
      head: [
        this.constructor.name,
        this.transport.constructor.name,
        this.transport instanceof TCPTransport ||
        this.transport instanceof UDPTransport
          ? `${this.transport.host}:${this.transport.port}`
          : null,
        this.identifier?.toString('hex'),
      ]
        .filter(Boolean)
        .join('/'),
    });

    this._transport = this.transport.addDevice(this);

    this.isOnline = new ReadOnlyObservable(
      new BooleanStateGroup(BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE, [
        transport.isConnected,
        this._isOnline,
      ])
    );

    this.seen = new ReadOnlyNullState(this._seen);

    this.isOnline.observe((online) => {
      this._log.info(() => (online ? 'online' : 'offline'));

      if (online) return;
      for (const [, resolver] of this._requests) {
        resolver(false, new Error('request aborted due to disconnection'));
      }
    });

    if (!keepalive) return;

    this._keepalive = this.addService(
      new Service(Buffer.of(KEEPALIVE_COMMAND))
    );

    this._keepaliveTolerateMissedPackets = keepaliveTolerateMissedPackets;

    setInterval(() => this._sendKeepAlive(), KEEPALIVE_INTERVAL);
  }

  private _handleEvent(payload: Buffer): void {
    for (const event of this._events) {
      event.ingest(payload);
    }
  }

  private _handleRequest(identifier: number, payload: Buffer): void {
    const resolver = this._requests.get(identifier);

    resolver?.(true, payload);
  }

  private async _sendKeepAlive() {
    if (!this._transport.isConnected.value) return;
    if (!this._keepalive) return;

    try {
      await this._keepalive.request(undefined, true, true);

      this._keepaliveMissedPackets = 0;
      this._isOnline.value = true;
    } catch {
      if (!this.isOnline.value) return;

      this._log.info(() => 'missed keepalive response');

      this._keepaliveMissedPackets += 1;

      if (
        this._keepaliveMissedPackets <= this._keepaliveTolerateMissedPackets
      ) {
        return;
      }

      this._log.warning(
        () =>
          `missed more keepalive responses (${this._keepaliveMissedPackets}) than tolerated (${this._keepaliveTolerateMissedPackets})`
      );

      this._keepaliveMissedPackets = 0;
      this._isOnline.value = false;
    }
  }

  /**
   * add an instance of Event to this device
   */
  addEvent<E extends Event<unknown>>(event: E): E {
    Event.isValidPropertyIdentifier(this._events, event.identifier);

    event._setDevice(this);
    this._events.add(event);

    return event;
  }

  /**
   * add an instance of Service to this device
   */
  addService<S extends Service<unknown, unknown>>(service: S): S {
    Service.isValidPropertyIdentifier(this._services, service.identifier);

    service._setDevice(this);
    this._services.add(service);

    return service;
  }

  /**
   * match incoming data to running requests on this device instance
   */
  matchDataToRequest(input: Buffer): void {
    if (!input.length) return;

    this._seen.trigger();

    const [{ identifier }, messagePayload] =
      headerIncoming.decodeOpenended(input);

    if (identifier === EVENT_IDENTIFIER) {
      this._handleEvent(messagePayload);
      return;
    }

    this._handleRequest(identifier, messagePayload);
  }

  /**
   * remove an instance of Property from this device
   */
  remove(property: Property): void {
    if (property instanceof Service) {
      this._services.delete(property);
    } else if (property instanceof Event) {
      this._events.delete(property);
    }
  }

  /**
   * issue request
   */
  request(
    message: Buffer = emptyBuffer,
    timeout: number,
    suppressErrors: boolean,
    ignoreOffline: boolean
  ): Request {
    if (!this.isOnline.value && !ignoreOffline) {
      const error = new Error('device is not online');

      if (!suppressErrors) {
        this._log.error(() => error.message);
      }

      return Promise.reject(error);
    }

    const id = (() => {
      let result: number;
      let initialResult: number | null = null;

      do {
        result = this._requestIdentifier.get();

        if (initialResult === result) break;
        if (initialResult === null) initialResult = result;
      } while (this._requests.has(result));

      return result;
    })();

    if (this._requests.has(id)) {
      const error = new Error(
        `request id "${id}" rolled over to itself but is still running`
      );

      if (!suppressErrors) {
        this._log.error(() => error.message);
      }

      return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
      this._transport._writeToTransport(
        payloadOutgoing.encode({
          header: {
            requestIdentifier: id,
          },
          message,
        })
      );

      const timer = timeout ? new Timer(timeout) : null;
      let observer: Observer | undefined;

      const resolver: RequestResolver = (success, result) => {
        observer?.remove();
        timer?.stop();

        this._requests.delete(id);

        if (success) {
          resolve(result as Buffer);
          return;
        }

        const error = new Error(
          `could not complete request "${id}": "${(result as Error).message}"`
        );

        if (!suppressErrors) {
          this._log.error(() => error.message);
        }

        reject(error);
      };

      observer = timer?.observe(() =>
        resolver(false, new Error('request timed out'))
      );

      this._requests.set(id, resolver);
      timer?.start();
    });
  }

  triggerReset(): void {
    if (!this._transport.isConnected.value) return;

    try {
      this._transport._writeToTransport(RESET_PAYLOAD);
    } catch {
      this._log.error(() => 'error triggering reset');
    }
  }
}
