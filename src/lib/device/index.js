import { readNumber, writeNumber } from '../utils/data.js';
import { EventEmitter } from 'events';
import { Logger } from '../log/index.js';
import { Timer } from '../utils/time.js';
import { rebind } from '../utils/oop.js';

/**
 * @typedef I_AnyTransport
 * @type {import('../transport/index.js').AnyTransport}
 */

/**
 * @typedef I_TransportDevice
 * @type {InstanceType<import('../transport/index.js')['TransportDevice']>}
*/

/**
 * @typedef DeviceServices
 * @type {Set<Service>}
 */

/**
 * @typedef Request
 * @type {Promise<Buffer>}
 */

/**
 * @typedef RequestResolver
 * @type {{
 *  resolver: (value: Buffer) => void,
 *  timer: InstanceType<import('../utils/time.js')['Timer']>
 * }}
*/

/**
 * @typedef DeviceOptions
 * @type {{
 *  transport: I_AnyTransport,
 *  identifier?: (Buffer|null),
 *  keepAlive?: number
 * }}
*/

/**
 * @type {string}
 */
const libName = 'device';

const eventIdentifier = 0x00;

export const onlineState = {
  true: Symbol('deviceIsOnline'),
  false: Symbol('deviceIsOffline')
};

export const eventSymbol = Symbol('event');

/**
 * @class Service
 */
class Service extends EventEmitter {

  /**
   * create instance of Service
   * @param {Buffer} identifier service id
   * @param {Device} device Device instance
   */
  constructor(identifier, device) {
    const {
      state: {
        services
      }
    } = device;

    services.forEach((previousDeviceService) => {
      const {
        state: {
          identifier: previousIdentifier
        }
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
      identifier
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
   * @param {Buffer} payload event payload
   */
  ingestEvent(payload) {
    const serviceIdentifier = payload.subarray(0, this.state.identifier.length);
    if (!serviceIdentifier.equals(this.state.identifier)) return;

    const eventData = payload.subarray(this.state.identifier.length);

    this.emit(eventSymbol, eventData);
  }

  /**
   * issue request on Device instance
   * @param {Buffer} payload request payload
   * @returns {Request}
   */
  request(payload) {
    return this.state.device.request(this.state.identifier, payload);
  }
}

/**
 * @class Device
 */
export class Device extends EventEmitter {

  /**
   * create instance of Device
   * @param {DeviceOptions} options configuration object
   */
  constructor(options) {
    const {
      transport,
      identifier,
      keepAlive = 2000
    } = options;

    super();

    this.log = new Logger();

    this.log.friendlyName('base device');

    this.state = {
      // for now, always online because device-level keep-alive messages are not yet implemented
      isOnline: /** @type {boolean|null} */ (true),
      services: /** @type {DeviceServices} */ (new Set()),
      requests: /** @type {Map<Number, RequestResolver>} */ (new Map()),

      identifier,
      keepAlive,
      log: this.log.withPrefix(libName)
    };

    this.transport = /** @type {I_TransportDevice|null} */ (transport.addDevice(this));

    rebind(
      this,
      'getService',
      'matchDataToRequest',
      'onOnlineChange',
      'removeService',
      'request'
    );
  }

  /**
   * @returns {number} request id
   */
  get _requestId() {
    return [1, ...this.state.requests.keys()].reduce((last, id) => {
      if (id > last) return id;
      return last;
    }, 0);
  }

  get online() {
    return Boolean(
      this.transport
      && this.transport.state.transport.state.isConnected
      && this.state.isOnline
    );
  }

  /**
   * @param {Buffer} payload
   */
  _handleEvent(payload) {
    const { services } = this.state;

    services.forEach((service) => {
      service.ingestEvent(payload);
    });
  }

  /**
   * @param {number} identifier
   * @param {Buffer} payload
   */
  _handleRequest(identifier, payload) {
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
   * @param {Buffer} requestIdentifier request id
   * @param {Buffer} serviceIdentifier service id
   * @param {Buffer} payload payload buffer
   */
  _writeToTransport(requestIdentifier, serviceIdentifier, payload) {
    this.transport.writeToTransport(
      Buffer.concat([
        requestIdentifier,
        serviceIdentifier,
        payload
      ])
    );
  }

  /**
   * add an instance of Service to this device
   * @param {Buffer} identifier service identifier
   * @returns {Service} instance of Service
   */
  getService(identifier) {
    const { services } = this.state;

    const service = new Service(identifier, this);
    services.add(service);

    return service;
  }

  /**
   * match incoming data to running requests on this device instance
   * @param {Buffer} message data
   */
  matchDataToRequest(message) {
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
  onOnlineChange() {
    this.emit(this.online ? onlineState.true : onlineState.false);
  }

  /**
   * remove an instance of Service from this device
   * @param {Service} service instance of Service
   */
  removeService(service) {
    this.state.services.delete(service);
  }

  /**
   * issue request
   * @param {Buffer} serviceIdentifier
   * @param {Buffer} payload
   * @return {Request}
   */
  request(serviceIdentifier, payload) {
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
        timer
      });
    });
  }
}
