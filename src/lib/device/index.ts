import {
  BooleanGroupStrategy,
  BooleanStateGroup,
} from '../state-group/index.js';
import { BooleanState, NullState } from '../state/index.js';
import {
  Observer,
  ObserverCallback,
  ReadOnlyObservable,
} from '../observable/index.js';
import { Transport, TransportDevice } from '../transport/index.js';
import { readNumber, writeNumber } from '../utils/data.js';
import { Input } from '../log/index.js';
import { Timer } from '../timer/index.js';
import { logger } from '../../app/logging.js';
import { rebind } from '../utils/oop.js';

type DeviceEvents = Set<Event>;
type DeviceServices = Set<Service>;

type Request<T = Buffer> = Promise<T>;

type RequestResolver = {
  resolver: (value: Buffer) => void;
  timer: Timer;
};

type DeviceIdentifier = Buffer | null;

const KEEPALIVE_IDENTIFIER = 0xff;
const KEEPALIVE_COMMAND = 0xff;
const KEEPALIVE_PAYLOAD = Buffer.from([
  KEEPALIVE_IDENTIFIER,
  KEEPALIVE_COMMAND,
]);

const EVENT_PEER_COMMAND = 0x00;
const EVENT_PEER_PRIORITY = 0x01;
const EVENT_PEER_SET = 0x01;
const EVENT_PEER_PAYLOAD = Buffer.from([
  KEEPALIVE_IDENTIFIER,
  EVENT_PEER_COMMAND,
  EVENT_PEER_PRIORITY,
  EVENT_PEER_SET,
]);

const EVENT_IDENTIFIER = 0x00;

export class Property {
  static isValidPropertyIdentifier(
    properties: DeviceServices | DeviceEvents,
    identifier: Buffer
  ): void {
    properties.forEach((previousProperty: Event | Service) => {
      if (previousProperty.identifier.equals(identifier)) {
        throw new Error(
          `cannot use the same identifier for multiple properties (${identifier})`
        );
      }
    });
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
      throw new Error('no device is present on this proerty');
    }

    return this._device.isOnline;
  }

  _setDevice(device: Device): void {
    this._device = device;
  }
}

export class Event<T = unknown> extends Property {
  private readonly _observable = new NullState<T>();

  // eslint-disable-next-line class-methods-use-this
  protected decode(input: Buffer): T {
    return (input as unknown) as T;
  }

  observe(observer: ObserverCallback<T>): Observer {
    return this._observable.observe(observer);
  }

  /**
   * ingest event from Device instance
   */
  ingest(payload: Buffer): void {
    const serviceIdentifier = payload.subarray(0, this.identifier.length);
    if (!serviceIdentifier.equals(this.identifier)) return;

    const eventData = payload.subarray(this.identifier.length);

    this._observable.trigger(this.decode(eventData));
  }
}

export class Service<T = unknown, S = unknown | void> extends Property {
  private readonly _timeout: number;

  // eslint-disable-next-line class-methods-use-this
  protected encode(input: S): Buffer {
    return (input as unknown) as Buffer;
  }

  // eslint-disable-next-line class-methods-use-this
  protected decode(input: Buffer): T | null {
    return (input as unknown) as T;
  }

  constructor(identifier: Buffer, timeout = 5000) {
    super(identifier);

    this._timeout = timeout;
  }

  /**
   * issue request on Device instance
   */
  request(payload: S | null = null): Request<T | null> {
    if (!this._device) {
      throw new Error('no device is present on this proerty');
    }

    return this._device
      .request(
        this.identifier,
        payload ? this.encode(payload) : null,
        this._timeout
      )
      .then((result) => this.decode(result));
  }
}

export class Device {
  private readonly _events = new Set<Event>();
  private readonly _isOnline = new BooleanState(false);
  private readonly _keepAliveTimer: Timer;
  private readonly _log: Input;
  private readonly _requests = new Map<number, RequestResolver>();
  private readonly _services = new Set<Service>();
  private readonly _transport: TransportDevice;

  readonly identifier: DeviceIdentifier;
  readonly isOnline: ReadOnlyObservable<boolean>;

  constructor(
    transport: Transport,
    identifier: DeviceIdentifier = null,
    keepAlive = 2000
  ) {
    rebind(this, '_sendKeepAlive');

    this._keepAliveTimer = new Timer(keepAlive);
    this._log = logger.getInput({
      head: `Device ${identifier}`,
    });
    this._transport = transport.addDevice(this);

    this.identifier = identifier;

    this.isOnline = new ReadOnlyObservable(
      new BooleanStateGroup(
        BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE,
        transport.isConnected,
        this._isOnline
      )
    );

    setInterval(this._sendKeepAlive, keepAlive);
    this._keepAliveTimer.observe(() => {
      this._isOnline.value = false;
    });
  }

  private get _requestId(): number {
    return (this._requests.size + 1) % 0xff || 1;
  }

  private _handleEvent(payload: Buffer): void {
    this._events.forEach((event) => {
      event.ingest(payload);
    });
  }

  private _handleRequest(identifier: number, payload: Buffer): void {
    const request = this._requests.get(identifier);
    if (!request) return;

    const { resolver, timer } = request;

    this._requests.delete(identifier);

    timer.stop();
    resolver(payload);
  }

  private _receiveKeepAlive() {
    this._keepAliveTimer.stop();
    this._isOnline.value = true;
  }

  private _sendKeepAlive() {
    this._transport._writeToTransport(KEEPALIVE_PAYLOAD);
    this._transport._writeToTransport(EVENT_PEER_PAYLOAD);
    this._keepAliveTimer.start();
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
        serviceIdentifier,
        ...(payload ? [payload] : []),
      ])
    );
  }

  /**
   * add an instance of Event to this device
   */
  addEvent(event: Event): void {
    Event.isValidPropertyIdentifier(this._events, event.identifier);

    event._setDevice(this);
    this._events.add(event);
  }

  /**
   * add an instance of Service to this device
   */
  addService(service: Service): void {
    Service.isValidPropertyIdentifier(this._services, service.identifier);

    service._setDevice(this);
    this._services.add(service);
  }

  /**
   * match incoming data to running requests on this device instance
   */
  matchDataToRequest(message: Buffer): void {
    if (!message.length) return;

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
    timeout: number
  ): Request {
    const id = this._requestId;

    return new Promise((resolver, reject) => {
      this._writeToTransport(writeNumber(id), serviceIdentifier, payload);
      const timer = new Timer(timeout);

      timer.observe((_, observer) => {
        observer.remove();
        reject(new Error('request timed out'));
      });

      timer.start();

      this._requests.set(id, {
        resolver,
        timer,
      });
    });
  }
}
