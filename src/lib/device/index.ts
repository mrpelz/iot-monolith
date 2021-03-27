import { AnyTransport, TransportDevice } from '../transport/index.js';
import { NullState, ReadOnlyNullState } from '../state/index.js';
import { readNumber, writeNumber } from '../utils/data.js';
import { Input } from '../log/index.js';
import { ReadOnlyObservable } from '../observable/index.js';
import { Timer } from '../utils/time.js';
import { logger } from '../../app/logging.js';
import { rebind } from '../utils/oop.js';

type DeviceEvents = Set<Event>;
type DeviceServices = Set<Service>;

type Request = Promise<Buffer>;

type RequestResolver = {
  resolver: (value: Buffer) => void;
  timer: Timer;
};

type DeviceIdentifier = Buffer | null;

const eventIdentifier = 0x00;

class Property {
  static isValidPropertyIdentifier(
    properties: DeviceServices | DeviceEvents,
    identifier: Buffer
  ) {
    properties.forEach((previousProperty: Event | Service) => {
      if (previousProperty.identifier.equals(identifier)) {
        throw new Error(
          `cannot use the same identifier for multiple properties (${identifier})`
        );
      }
    });
  }

  protected readonly _device: Device;

  readonly identifier: Buffer;

  constructor(identifier: Buffer, device: Device) {
    this.identifier = identifier;
    this._device = device;
  }

  /**
   * get device online state
   */
  get isOnline() {
    return this._device.isOnline;
  }
}

class Event extends Property {
  private readonly _observable = new NullState<Buffer>();
  readonly observable: ReadOnlyNullState<Buffer>;

  constructor(identifier: Buffer, device: Device) {
    super(identifier, device);

    this.observable = new ReadOnlyNullState(this._observable);
  }

  /**
   * ingest event from Device instance
   */
  ingest(payload: Buffer) {
    const serviceIdentifier = payload.subarray(0, this.identifier.length);
    if (!serviceIdentifier.equals(this.identifier)) return;

    const eventData = payload.subarray(this.identifier.length);

    this._observable.trigger(eventData);
  }

  /**
   * remove Event from Device
   */
  remove(): void {
    this._device.remove(this);
  }
}

class Service extends Property {
  private readonly _timeout: number;

  constructor(identifier: Buffer, timeout: number, device: Device) {
    super(identifier, device);

    this._timeout = timeout;
  }

  /**
   * issue request on Device instance
   */
  request(payload: Buffer | null = null): Request {
    return this._device.request(this.identifier, payload, this._timeout);
  }

  /**
   * remove Event from Device
   */
  remove(): void {
    this._device.remove(this);
  }
}

export class Device {
  private readonly _events = new Set<Event>();
  private readonly _log: Input;
  private readonly _requests = new Map<number, RequestResolver>();
  private readonly _services = new Set<Service>();
  private readonly _transport: TransportDevice;

  readonly identifier: DeviceIdentifier;
  readonly isOnline: ReadOnlyObservable<boolean>;

  constructor(transport: AnyTransport, identifier: DeviceIdentifier = null) {
    rebind(
      this,
      'getService',
      'matchDataToRequest',
      'removeService',
      'request'
    );

    this.identifier = identifier;
    this._log = logger.getInput({
      head: `${identifier}`,
    });
    this._transport = transport.addDevice(this);

    this.isOnline = transport.isConnected;
  }

  private get _requestId(): number {
    return [1, ...this._requests.keys()].reduce((last, id) => {
      if (id > last) return id;
      return last;
    }, 0);
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

    timer.stop(true);
    resolver(payload);
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
  getEvent(identifier: Buffer): Event {
    Event.isValidPropertyIdentifier(this._events, identifier);

    const event = new Event(identifier, this);
    this._events.add(event);

    return event;
  }

  /**
   * add an instance of Service to this device
   */
  getService(identifier: Buffer, timeout: number): Service {
    Service.isValidPropertyIdentifier(this._services, identifier);

    const service = new Service(identifier, timeout, this);
    this._services.add(service);

    return service;
  }

  /**
   * match incoming data to running requests on this device instance
   */
  matchDataToRequest(message: Buffer): void {
    if (!message.length) return;

    const requestIdentifier = readNumber(message.subarray(0, 1));
    const payload = message.subarray(1);

    if (requestIdentifier === eventIdentifier) {
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

      timer.on('hit', () => {
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
