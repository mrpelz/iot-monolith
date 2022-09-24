import {
  BooleanGroupStrategy,
  BooleanState,
  BooleanStateGroup,
  NullState,
  ReadOnlyNullState,
} from '../state.js';
import { Input, Logger } from '../log.js';
import { NUMBER_RANGES, RollingNumber } from '../rolling-number.js';
import { Observer, ReadOnlyObservable } from '../observable.js';
import { Transport, TransportDevice } from '../transport/main.js';
import { emptyBuffer, falseBuffer, readNumber, writeNumber } from '../data.js';
import { TCPDevice } from './tcp.js';
import { TCPTransport } from '../transport/tcp.js';
import { Timer } from '../timer.js';
import { UDPDevice } from './udp.js';
import { UDPTransport } from '../transport/udp.js';

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
const DEFAULT_TIMEOUT = 500;

const KEEPALIVE_COMMAND = 0xff;
const KEEPALIVE_INTERVAL = 2000;
const KEEPALIVE_TOLERATE_MISSED_PACKETS = 1;

const RESET_OPTIONS = [
  Buffer.from([0xff]),
  Buffer.from([KEEPALIVE_COMMAND]),
  Buffer.from([1]),
] as const;

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

  constructor(identifier: Buffer, timeout = DEFAULT_TIMEOUT) {
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
  request(
    payload: S,
    suppressErrors = false,
    ignoreOffline = false
  ): Request<T | null> {
    if (!this._device) {
      throw new Error('no device is present on this property');
    }

    return this._device
      .request(
        this.identifier,
        this.encode(payload),
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
    0,
    NUMBER_RANGES.uint8,
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
      new Service(Buffer.from([KEEPALIVE_COMMAND]))
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
   * write from Device instance to Transport instance
   */
  _writeToTransport(
    requestIdentifier: Buffer,
    serviceIdentifier: Buffer,
    message: Buffer | null = null
  ): void {
    this._transport._writeToTransport(
      Buffer.concat([
        requestIdentifier,
        versionBuffer,
        serviceIdentifier,
        // insert 0 service index when service identifier doesn't include index already
        serviceIdentifier.length <= 1 ? falseBuffer : emptyBuffer,
        message ? message : emptyBuffer,
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
      this._writeToTransport(writeNumber(id), serviceIdentifier, payload);

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
      this._writeToTransport(...RESET_OPTIONS);
    } catch {
      this._log.error(() => 'error triggering reset');
    }
  }
}
