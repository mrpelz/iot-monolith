const EventEmitter = require('events');

const { Logger } = require('../log');
const { rebind } = require('../utils/oop');

/**
 * @typedef I_AnyTransport
 * @type {import('../transport').AnyTransport}
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

      identifier,
      keepAlive,
      log: this.log.withPrefix(libName),
      transport: transport.addDevice(this)
    };

    rebind(
      this,
      'ingest',
      'setOnline',
      'setOffline'
    );
  }

  /**
   * ingest data into Device instance
   * @param {Buffer} payload data
   */
  ingestIntoDeviceInstance(payload) {
    throw new Error(
      `nothing to do in ${this}${payload}`
    );
  }

  /**
   * set device online status to true
   */
  setOnline() {
    this.state.isOnline = true;

    this.emit(onlineState.true);
  }

  /**
   * set device online status to false
   */
  setOffline() {
    this.state.isOnline = false;

    this.emit(onlineState.false);
  }
}

module.exports = {
  Device,
  onlineState
};
