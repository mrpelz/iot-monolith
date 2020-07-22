import { AnyTransport, TransportDevice } from '../transport/index.js';
import { readNumber, writeNumber } from '../utils/data.js';
import { EventEmitter } from 'events';
import { Input } from '../log/index.js';
import { Timer } from '../utils/time.js';
import { logger } from '../../app/logging.js';
import { rebind } from '../utils/oop.js';

type DeviceServices = Set<Service>;

type Request = Promise<Buffer>;

type RequestResolver = {
  resolver: (value: Buffer) => void;
  timer: Timer;
};

type DeviceState = {
  identifier: Buffer | null;
  isOnline: boolean | null;
  keepAlive: number;
  log: Input;
  requests: Map<number, RequestResolver>;
  services: DeviceServices;
};

type DeviceOptions = {
  transport: AnyTransport;
  identifier?: DeviceState['identifier'];
  keepAlive?: DeviceState['keepAlive'];
};

type ServiceState = {
  device: Device;
  identifier: Buffer;
};

const eventIdentifier = 0x00;

export const onlineState = {
  false: Symbol('deviceIsOffline'),
  true: Symbol('deviceIsOnline'),
};

export const eventSymbol = Symbol('event');

class Service extends EventEmitter {
  state: ServiceState;

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

    super();

    this.state = {
      device,
      identifier,
    };
  }

  /**
   * get device online state
   */
  get online() {
    return this.state.device.online;
  }

  /**
   * ingest event from Device instance
   */
  ingestEvent(payload: Buffer) {
    const serviceIdentifier = payload.subarray(0, this.state.identifier.length);
    if (!serviceIdentifier.equals(this.state.identifier)) return;

    const eventData = payload.subarray(this.state.identifier.length);

    this.emit(eventSymbol, eventData);
  }

  /**
   * issue request on Device instance
   */
  request(payload: Buffer | null = null): Request {
    return this.state.device.request(this.state.identifier, payload);
  }
}

export class Device extends EventEmitter {
  state: DeviceState;

  transport: TransportDevice;

  constructor(options: DeviceOptions) {
    const { transport, identifier = null, keepAlive = 2000 } = options;

    super();

    this.state = {
      // for now, always online because device-level keep-alive messages are not yet implemented
      isOnline: true,
      requests: new Map(),
      services: new Set(),

      /* eslint-disable-next-line sort-keys */
      identifier,
      keepAlive,
      log: logger.getInput({
        head: '',
      }),
    };

    this.transport = transport.addDevice(this);

    rebind(
      this,
      'getService',
      'matchDataToRequest',
      'onOnlineChange',
      'removeService',
      'request'
    );
  }

  get _requestId(): number {
    return [1, ...this.state.requests.keys()].reduce((last, id) => {
      if (id > last) return id;
      return last;
    }, 0);
  }

  get online(): boolean {
    return Boolean(
      this.transport &&
        this.transport.state.transport.state.isConnected &&
        this.state.isOnline
    );
  }

  _handleEvent(payload: Buffer): void {
    const { services } = this.state;

    services.forEach((service) => {
      service.ingestEvent(payload);
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
   * add an instance of Service to this device
   */
  getService(identifier: Buffer): Service {
    const { services } = this.state;

    const service = new Service(identifier, this);
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
   * handle change in Transport online state
   */
  onOnlineChange(): void {
    this.emit(this.online ? onlineState.true : onlineState.false);
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
  request(serviceIdentifier: Buffer, payload: Buffer | null = null): Request {
    const { requests, keepAlive } = this.state;
    const id = this._requestId;

    return new Promise((resolver, reject) => {
      this._writeToTransport(writeNumber(id), serviceIdentifier, payload);
      const timer = new Timer(keepAlive);

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
