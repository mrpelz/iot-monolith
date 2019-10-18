const EventEmitter = require('events');

const { Logger } = require('../log');
const { rebind } = require('../utils/oop');

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

const onlineState = {
  true: Symbol('deviceIsOnline'),
  false: Symbol('deviceIsOffline')
};

/**
 * @class DeviceService
 */
class DeviceService {

  /**
   * create instance of DeviceService
   * @param {Device} device Device instance
   * @param {AnyService} service Service instance
   */
  constructor(device, service) {
    this.state = {
      device,
      service
    };
  }

  /**
   * write data from Service instance to Device instance
   * @param {Buffer} payload payload buffer
   */
  writeToDevice(payload) {
    this.state.device.writeToTransport(payload);
  }

  /**
   * write data from Device instance to Service instance
   * @param {Buffer} payload payload buffer
   */
  ingestIntoServiceInstance(payload) {
    // @todo: implement service
    this.state.service.ingest(payload);
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
   * add an instance of Service to this device
   * @param {unknown} service instance of Service
   * @returns {DeviceService} instance of DeviceService
   */
  addService(service) {
    const { services } = this.state;

    const deviceService = new DeviceService(this, service);
    services.add(deviceService);

    return deviceService;
  }

  /**
   * ingest data from device into DeviceService instances
   * @param {Buffer} payload data
   */
  ingestIntoServiceInstances(payload) {
    this.state.services.forEach((service) => {
      service.ingestIntoServiceInstance(payload);
    });
  }

  /**
   * remove an instance of Service from this device
   * @param {DeviceService} deviceService instance of DeviceService
   */
  removeService(deviceService) {
    this.state.services.delete(deviceService);
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

  /**
   * write from Device instance to Transport instance
   * @param {Buffer} payload payload buffer
   */
  writeToTransport(payload) {
    this.state.transport.writeToTransport(payload);
  }
}

module.exports = {
  Device,
  onlineState
};
