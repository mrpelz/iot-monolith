import { AnyTransport, TransportDevice } from '../transport/index.js';
import {
  BooleanGroupStrategy,
  BooleanStateGroup,
} from '../state-group/index.js';
import { BooleanState, NullState } from '../state/index.js';
import { readNumber, writeNumber } from '../utils/data.js';
import { Input } from '../log/index.js';
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

type DeviceState = {
  events: DeviceEvents;
  identifier: Buffer | null;
  isOnline: BooleanState;
  log: Input;
  requests: Map<number, RequestResolver>;
  services: DeviceServices;
};

type DeviceOptions = {
  transport: AnyTransport;
  identifier?: DeviceState['identifier'];
};

type PropertyState = {
  device: Device;
  identifier: Buffer;
};

type ServiceState = {
  timeout: number;
};

const eventIdentifier = 0x00;

class Property {
  state: PropertyState;

  constructor(identifier: Buffer, device: Device) {
    const {
      state: { services },
    } = device;

    services.forEach((previousDeviceService) => {
      const {
        state: { identifier: previousIdentifier },
      } = previousDeviceService;

      if (previousIdentifier.equals(identifier)) {
        throw new Error(
          `cannot use the same identifier for multiple services (${identifier})`
        );
      }
    });

    this.state = {
      device,
      identifier,
    };
  }

  /**
   * get device online state
   */
  get isOnline() {
    return this.state.device.isOnline;
  }
}

class Event extends Property {
  observable: NullState<Buffer>;

  /**
   * ingest event from Device instance
   */
  ingest(payload: Buffer) {
    const serviceIdentifier = payload.subarray(0, this.state.identifier.length);
    if (!serviceIdentifier.equals(this.state.identifier)) return;

    const eventData = payload.subarray(this.state.identifier.length);

    this.observable.trigger(eventData);
  }

  /**
   * remove Event from Device
   */
  remove(): void {
    this.state.device.removeEvent(this);
  }
}

class Service extends Property {
  serviceState: ServiceState;

  constructor(identifier: Buffer, timeout: number, device: Device) {
    super(identifier, device);

    this.serviceState = {
      timeout,
    };
  }

  /**
   * issue request on Device instance
   */
  request(payload: Buffer | null = null): Request {
    return this.state.device.request(
      this.state.identifier,
      payload,
      this.serviceState.timeout
    );
  }

  /**
   * remove Event from Device
   */
  remove(): void {
    this.state.device.removeService(this);
  }
}

export class Device {
  state: DeviceState;

  transport: TransportDevice;

  isOnline: BooleanStateGroup;

  constructor(options: DeviceOptions) {
    const { transport, identifier = null } = options;

    rebind(
      this,
      'getService',
      'matchDataToRequest',
      'removeService',
      'request'
    );

    this.state = {
      // for now, always online because device-level keep-alive messages are not yet implemented
      events: new Set(),
      isOnline: new BooleanState(true),
      requests: new Map(),
      services: new Set(),

      /* eslint-disable-next-line sort-keys */
      identifier,
      log: logger.getInput({
        head: '',
      }),
    };

    this.transport = transport.addDevice(this);
    this.isOnline = new BooleanStateGroup(
      BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE,
      transport.state.isConnected,
      this.state.isOnline
    );
  }

  get _requestId(): number {
    return [1, ...this.state.requests.keys()].reduce((last, id) => {
      if (id > last) return id;
      return last;
    }, 0);
  }

  _handleEvent(payload: Buffer): void {
    const { events } = this.state;

    events.forEach((event) => {
      event.ingest(payload);
    });
  }

  _handleRequest(identifier: number, payload: Buffer): void {
    const { requests } = this.state;

    const request = requests.get(identifier);
    if (!request) return;

    const { resolver, timer } = request;

    requests.delete(identifier);

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
    this.transport.writeToTransport(
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
    const { events } = this.state;

    const event = new Event(identifier, this);
    events.add(event);

    return event;
  }

  /**
   * add an instance of Service to this device
   */
  getService(identifier: Buffer, timeout: number): Service {
    const { services } = this.state;

    const service = new Service(identifier, timeout, this);
    services.add(service);

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
   * remove an instance of Service from this device
   */
  removeEvent(event: Event): void {
    this.state.events.delete(event);
  }

  /**
   * remove an instance of Service from this device
   */
  removeService(service: Service): void {
    this.state.services.delete(service);
  }

  /**
   * issue request
   */
  request(
    serviceIdentifier: Buffer,
    payload: Buffer | null = null,
    timeout: number
  ): Request {
    const { requests } = this.state;
    const id = this._requestId;

    return new Promise((resolver, reject) => {
      this._writeToTransport(writeNumber(id), serviceIdentifier, payload);
      const timer = new Timer(timeout);

      timer.on('hit', () => {
        reject(new Error('request timed out'));
      });

      timer.start();

      requests.set(id, {
        resolver,
        timer,
      });
    });
  }
}
