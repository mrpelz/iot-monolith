const EventEmitter = require('events');

const { Logger } = require('../log');
const { writeNumber, readNumber } = require('../utils/data');
const { rebind } = require('../utils/oop');
const { Timer } = require('../utils/time');

/**
 * @typedef I_AnyTransport
 * @type {import('../transport').AnyTransport}
 */

/**
 * @typedef DeviceServices
 * @type {Set<DeviceService>}
 */

 // @todo: implement service
 /**
 * @typedef AnyService
 * @type {unknown}
 */

/**
 * @typedef Request
 * @type {Promise<Buffer>}
 */

 /**
 * @typedef RequestResolver
 * @type {{
 *  resolver: (value: Buffer) => void,
 *  timer: InstanceType<import('../utils/time')['Timer']>
 * }}
 */

 /**
 * @typedef DeviceOptions
 * @type {{
 *   transport: I_AnyTransport,
 *   identifier?: (Buffer|null),
 *   keepAlive?: number
 * }}
 */

/**
 * @type {string}
 */
const libName = 'device';

const eventIdentifier = 0x00;

const onlineState = {
  true: Symbol('deviceIsOnline'),
  false: Symbol('deviceIsOffline')
};

const eventSymbol = Symbol('event');

/**
 * @class DeviceService
 */
class DeviceService extends EventEmitter {

  /**
   * create instance of DeviceService
   * @param {Buffer} identifier service id
   * @param {Device} device Device instance
   * @param {AnyService} service Service instance
   */
  constructor(identifier, device, service) {
    const {
      state: {
        services
      }
    } = device;

    services.forEach((previousTransportDevice) => {
      const {
        state: {
          identifier: previousIdentifier
        }
      } = previousTransportDevice;

      if (previousIdentifier.equals(identifier)) {
        throw new Error(
          `cannot use the same identifier for multiple services (${identifier})`
        );
      }
    });

    super();

    this.state = {
      device,
      service,
      identifier
    };
  }

  /**
   * get device online state
   */
  get online() {
    return this.state.device.state.isOnline;
  }

  /**
   * issue request on Device instance
   * @param {Buffer} payload request payload
   * @returns {Request}
   */
  request(payload) {
    return this.state.device.request(this.state.identifier, payload);
  }

  /**
   * ingest event from Device instance
   * @param {Buffer} payload event payload
   */
  ingestEvent(payload) {
    this.emit(eventSymbol, payload);
  }
}

/**
 * @class Device
 */
class Device extends EventEmitter {

  /**
   * create instance of Device
   * @param {DeviceOptions} options configuration object
   */
  constructor(options) {
    const {
      identifier,
      keepAlive = 2000,
      transport
    } = options;

    super();

    this.log = new Logger();

    this.log.friendlyName('base device');

    this.state = {
      isOnline: /** @type {boolean|null} */ (null),
      services: /** @type {DeviceServices} */ (new Set()),
      requests: /** @type {Map<Number, RequestResolver>} */ (new Map()),

      identifier,
      keepAlive,
      log: this.log.withPrefix(libName),
      transport: transport.addDevice(this)
    };

    rebind(
      this,
      'addService',
      'ingestIntoServiceInstances',
      'removeService',
      'setOffline',
      'setOnline',
      'writeToTransport'
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

  /**
   * @param {Buffer} message
   */
  _handleEvent(message) {
    const { services } = this.state;

    const matchingService = [...services.values()].find((service) => (
      message.indexOf(service.state.identifier) === 0)
    );

    if (!matchingService) return;

    const payload = message.subarray(matchingService.state.identifier.length);

    matchingService.ingestEvent(payload);
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
    this.state.transport.writeToTransport(
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
   * @param {AnyService} service instance of Service
   * @returns {DeviceService} instance of DeviceService
   */
  addService(identifier, service) {
    const { services } = this.state;

    const deviceService = new DeviceService(identifier, this, service);
    services.add(deviceService);

    return deviceService;
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
   * remove an instance of Service from this device
   * @param {DeviceService} deviceService instance of DeviceService
   */
  removeService(deviceService) {
    this.state.services.delete(deviceService);
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

  /**
   * set device online status to false
   */
  setOffline() {
    this.state.isOnline = false;

    this.emit(onlineState.false);
  }

  /**
   * set device online status to true
   */
  setOnline() {
    this.state.isOnline = true;

    this.emit(onlineState.true);
  }
}

module.exports = {
  Device,
  onlineState,
  eventSymbol
};
