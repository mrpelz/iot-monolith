import {
  BooleanGroupStrategy,
  BooleanState,
  BooleanStateGroup,
  NullState,
  ReadOnlyNullState,
} from '../state.js';
import { Input, Logger } from '../log.js';
import { NUMBER_RANGES, RollingNumber } from '../rolling-number.js';
import { Transport, TransportDevice } from '../transport/main.js';
import { emptyBuffer, falseBuffer, readNumber, writeNumber } from '../data.js';
import { ReadOnlyObservable } from '../observable.js';
import { TCPDevice } from './tcp.js';
import { TCPTransport } from '../transport/tcp.js';
import { Timer } from '../timer.js';
import { UDPDevice } from './udp.js';
import { UDPTransport } from '../transport/udp.js';

export type IpDevice = TCPDevice | UDPDevice;

type DeviceEvents = Set<Event<unknown>>;
type DeviceServices = Set<Service<unknown, unknown>>;

type Request<T = Buffer> = Promise<T>;

type RequestResolver = {
  reject: (reason?: unknown) => void;
  resolver: (value: Buffer) => void;
  timer: Timer | null;
};

type DeviceIdentifier = Buffer | null;

const KEEPALIVE_INTERVAL = 1000;

const VERSION = 2;

const KEEPALIVE_IDENTIFIER = 0xff;
const KEEPALIVE_COMMAND = 0xff;
const KEEPALIVE_PAYLOAD = Buffer.from([
  KEEPALIVE_IDENTIFIER,
  VERSION,
  KEEPALIVE_COMMAND,
  0,
]);

const RESET_PAYLOAD = Buffer.from([
  KEEPALIVE_IDENTIFIER,
  VERSION,
  KEEPALIVE_COMMAND,
  0,
  1,
]);

export const EVENT_IDENTIFIER = 0x00;

const versionBuffer = Buffer.from([VERSION]);

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
  private readonly _observable = new NullState<T>();

  readonly observable: ReadOnlyNullState<T>;

  constructor(identifier: Buffer) {
    super(identifier);

    this.observable = new ReadOnlyNullState<T>(this._observable);
  }

  protected decode(input: Buffer): T | null {
    if (!input.length) return null;
    return input as unknown as T;
  }

  /**
   * ingest event from Device instance
   */
  ingest(payload: Buffer): void {
    const eventIdentifier = payload.subarray(0, this.identifier.length);
    if (!eventIdentifier.equals(this.identifier)) return;

    const eventData = this.decode(payload.subarray(this.identifier.length));

    if (eventData === null) return;
    this._observable.trigger(eventData);
  }
}

export class Service<T = void, S = void> extends Property {
  private readonly _timeout: number;

  constructor(identifier: Buffer, timeout = 5000) {
    super(identifier);

    this._timeout = timeout;
  }

  protected decode(input: Buffer): T | null {
    if (!input.length) return null;
    return input as unknown as T;
  }

  protected encode(input: S): Buffer {
    return input as unknown as Buffer;
  }

  /**
   * issue request on Device instance
   */
  request(payload: S, suppressErrors = false): Request<T | null> {
    if (!this._device) {
      throw new Error('no device is present on this property');
    }

    return this._device
      .request(
        this.identifier,
        this.encode(payload),
        this._timeout,
        suppressErrors
      )
      .then((result) => this.decode(result));
  }
}

export class Device<T extends Transport = Transport> {
  private readonly _events = new Set<Event<unknown>>();
  private readonly _isOnline = new BooleanState(false);
  private readonly _keepAliveReceiveTimer: Timer | null = null;
  private readonly _log: Input;

  private readonly _requestIdentifier = new RollingNumber(
    0,
    NUMBER_RANGES.uint8,
    [EVENT_IDENTIFIER, KEEPALIVE_IDENTIFIER]
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
    keepAlive = 5000
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

    this.isOnline.observe((online) =>
      this._log.info(() => (online ? 'online' : 'offline'))
    );

    if (!keepAlive) return;

    this._keepAliveReceiveTimer = new Timer(keepAlive);

    transport.isConnected.observe((transportConnected) => {
      if (!transportConnected) return;

      this._sendKeepAlive();
    });

    this._keepAliveReceiveTimer.observe(() => {
      this._isOnline.value = false;

      for (const [, request] of this._requests) {
        request.reject(new Error('request aborted due to disconnection'));
      }
    });

    setInterval(() => this._sendKeepAlive(), KEEPALIVE_INTERVAL);
  }

  private _handleEvent(payload: Buffer): void {
    for (const event of this._events) {
      event.ingest(payload);
    }
  }

  private _handleRequest(identifier: number, payload: Buffer): void {
    const request = this._requests.get(identifier);
    if (!request) return;

    const { resolver, timer } = request;

    this._requests.delete(identifier);

    timer?.stop();
    resolver(payload);
  }

  private _receiveKeepAlive() {
    this._keepAliveReceiveTimer?.start();
    this._isOnline.value = true;
  }

  private _sendKeepAlive() {
    if (!this._transport.isConnected.value) return;

    try {
      this._transport._writeToTransport(KEEPALIVE_PAYLOAD);
    } catch {
      this._log.error(() => 'error writing keepalive packet');
    }
  }

  /**
   * write from Device instance to Transport instance
   */
  _writeToTransport(
    requestIdentifier: Buffer,
    serviceIdentifier: Buffer,
    payload: Buffer | null = null
  ): void {
    this._transport._writeToTransport(
      Buffer.concat([
        requestIdentifier,
        versionBuffer,
        serviceIdentifier,
        // insert 0 service index when service identifier doesn't include index already
        serviceIdentifier.length <= 1 ? falseBuffer : emptyBuffer,
        payload ? payload : emptyBuffer,
      ])
    );
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
  matchDataToRequest(message: Buffer): void {
    if (!message.length) return;

    this._seen.trigger();

    const requestIdentifier = readNumber(message.subarray(0, 1));
    const payload = message.subarray(1);

    if (requestIdentifier === KEEPALIVE_IDENTIFIER && !payload.length) {
      this._receiveKeepAlive();
      return;
    }

    if (requestIdentifier === EVENT_IDENTIFIER) {
      this._handleEvent(payload);
      return;
    }

    this._handleRequest(requestIdentifier, payload);
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
    serviceIdentifier: Buffer,
    payload: Buffer | null = null,
    timeout: number,
    suppressErrors = false
  ): Request {
    if (!this._isOnline.value) {
      const error = new Error('device is not online');

      if (!suppressErrors) {
        this._log.error(() => error.message);
      }

      return Promise.reject(error);
    }

    const id = this._requestIdentifier.get();

    return new Promise((resolver, reject) => {
      this._writeToTransport(writeNumber(id), serviceIdentifier, payload);

      const timer = timeout ? new Timer(timeout) : null;

      timer?.observe((_, observer) => {
        observer.remove();
        const error = new Error('request timed out');

        if (!suppressErrors) {
          this._log.error(() => error.message);
        }

        reject(error);
      });

      timer?.start();

      this._requests.set(id, {
        reject,
        resolver,
        timer,
      });
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
