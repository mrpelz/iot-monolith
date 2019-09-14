const { Logger } = require('../log');
const { rebind } = require('../utils/oop');
const { emptyBuffer } = require('../utils/data');

/**
 * @typedef Device
 * @type {any} Device class is not yet implemented
 */

/**
 * @type {string}
 */
const libName = 'transport';

class TransportDevice {

  /**
   * create instance of TransportDevice
   * @param {(Transport|AggregatedTransport)} transport Transport instance
   * @param {Device} device Device instance
   */
  constructor(transport, device) {
    const {
      devices,
      identifier: transportIdentifier
    } = transport.state;

    const {
      identifier: deviceIdentifier
    } = device.state;

    if (
      transportIdentifier.length
      && transportIdentifier.length !== deviceIdentifier.length
    ) {
      throw new Error('device identifier has wrong length for transport');
    }

    if (transportIdentifier.length && deviceIdentifier.equals(transportIdentifier)) {
      throw new Error('cannot use same identifier on transport and device');
    }

    devices.forEach((previousTransportDevice) => {
      const {
        identifier: previousDeviceIdentifier
      } = previousTransportDevice.state.device.state;

      if (previousDeviceIdentifier.equals(deviceIdentifier)) {
        throw new Error(
          `cannot use the same identifier for multiple devices (${deviceIdentifier})`
        );
      }
    });

    this.state = {
      transport,
      device
    };
  }

  /**
   * write data from Device instance to Transport instance
   * @param {Buffer} payload payload buffer
   * @returns {void}
   */
  writeToTransport(payload) {
    const {
      transport,
      transport: {
        state: {
          identifier: transportIdentifier
        }
      },
      device: {
        state: {
          identifier: deviceIdentifier
        }
      }
    } = this.state;

    transport.write(transportIdentifier.length ? deviceIdentifier : null, payload);
  }

  /**
   * write data from Transport instance to Device instance
   * @param {(Buffer|null)} identifier identifier buffer
   * @param {Buffer} payload payload buffer
   * @returns {void}
   */
  ingestIntoDeviceInstances(identifier, payload) {
    const {
      transport: {
        state: {
          identifier: transportIdentifier
        }
      },
      device,
      device: {
        state: {
          identifier: deviceIdentifier
        }
      }
    } = this.state;

    if (transportIdentifier.length) {
      if (!identifier || transportIdentifier.length !== identifier.length) {
        throw new Error('incoming message identifier has wrong length for device');
      }

      if (!identifier.equals(deviceIdentifier.length)) return;
    }

    device.ingest(payload);
  }

  /**
   * set device online status to true
   * @returns {void}
   */
  setOnline() {
    const {
      device
    } = this.state;

    device.setOnline();
  }

  /**
   * set device online status to false
   * @returns {void}
   */
  setOffline() {
    const {
      device
    } = this.state;

    device.setOffline();
  }
}

/**
  * @typedef TransportDevices
  * @type {Set<TransportDevice>}
  */

/**
  * @typedef TransportOptions
  * @type {{
  *  devices?: TransportDevices,
  *  identifier?: Buffer,
  *  singleDevice?: boolean
  * }}
  */

/**
  * @class Transport
  */
class Transport {

  /**
   * create instance of Transport
   * @param {TransportOptions} options configuration object
   */
  constructor(options) {
    const {
      devices = /** @type {TransportDevices} */ (new Set()),
      identifier = emptyBuffer,
      singleDevice = true
    } = options;

    if (!singleDevice && !identifier.length) {
      throw new Error('identifier length is required for multi device transport');
    }

    this.log = new Logger();

    this.log.friendlyName('base transport');

    this.state = {
      devices,
      identifier,
      log: this.log.withPrefix(libName),
      singleDevice: Boolean(singleDevice)
    };

    rebind(
      this,
      'addDevice',
      'write'
    );
  }

  /**
   * ingest data from transport into TransportDevice instances
   * @private
   * @param {(Buffer|null)} identifier identifier buffer
   * @param {Buffer} payload payload buffer
   * @returns {void}
   */
  _ingestIntoDeviceInstances(identifier, payload) {
    const { devices } = this.state;

    // const identifier = identifierLength ? data.subarray(0, identifierLength) : null;
    // const payload = data.subarray(identifierLength);

    devices.forEach((device) => {
      device.ingestIntoDeviceInstances(identifier, payload);
    });
  }

  /**
   * set the online status of all devices on this transport to true
   * @returns {void}
   */
  _setOnline() {
    const { devices } = this.state;

    devices.forEach((device) => {
      device.setOnline();
    });
  }

  /**
   * set the online status of all devices on this transport to false
   * @returns {void}
   */
  _setOffline() {
    const { devices } = this.state;

    devices.forEach((device) => {
      device.setOffline();
    });
  }

  /**
   * add an instance of Device to this transport
   * @param {Device} device instance of Device
   * @returns {TransportDevice} instance of TransportDevice
   */
  addDevice(device) {
    const { devices, singleDevice } = this.state;

    if (singleDevice && devices.size >= 1) {
      throw new Error('can only add one device to single device transport');
    }

    const transportDevice = new TransportDevice(this, device);
    devices.add(transportDevice);

    return transportDevice;
  }

  /**
   * connect Transport instance – placeholder
   * @returns {void}
   */
  connect() {
    throw new Error(
      `no connect method defined in ${this}`
    );
  }

  /**
   * disconnect Transport instance – placeholder
   * @returns {void}
   */
  disconnect() {
    throw new Error(
      `no disconnect method defined in ${this}`
    );
  }

  /**
   * reconnect Transport instance – placeholder
   * @returns {void}
   */
  reconnect() {
    throw new Error(
      `no reconnect method defined in ${this}`
    );
  }

  /**
   * write from Transport instance to network – placeholder
   * @param {(Buffer|null)} identifier identifier buffer
   * @param {Buffer} payload payload buffer
   * @returns {void}
   */
  write(identifier, payload) {
    throw new Error(
      `no write method defined in ${this} to process identifier "${identifier}" and payload "${payload}"`
    );
  }
}

/**
 * @class AggregatedTransport
 */
class AggregatedTransport {

  /**
   * create dataset of SubTransports
   * @param {Object} SubTransport transport class to be instantiated
   * @param {TransportOptions} parentOptions configuration object
   * @param {Array<TransportOptions>} transportOptions array of configuration objects
   * @returns {Array<Transport>} array of Transport instances
   */
  static createSubTransports(SubTransport, parentOptions, transportOptions) {
    return transportOptions.map((transportOption) => {
      return new SubTransport({
        ...transportOption,
        ...parentOptions
      });
    });
  }

  /**
   * create instance of AggregatedTransport
   * @param {TransportOptions} options configuration object
   * @param {Object} SubTransport transport class to be instantiated
   * @param  {...TransportOptions} transportOptions transport configuration objects
   */
  constructor(options, SubTransport, ...transportOptions) {
    const {
      devices = /** @type {TransportDevices} */ (new Set()),
      identifier = emptyBuffer
    } = options;

    if (
      SubTransport === undefined
      || devices === undefined
      || identifier === undefined
    ) {
      throw new Error('insufficient options provided');
    }

    if (!identifier.length) {
      throw new Error('identifier length is required for aggregate transport');
    }

    this.log = new Logger();

    this.log.friendlyName('aggregated transport');

    this.state = {
      transports: AggregatedTransport.createSubTransports(
        SubTransport,
        options,
        transportOptions
      ),
      devices,
      identifier,
      log: this.log.withPrefix(libName)
    };

    rebind(
      this,
      'addDevice',
      'write'
    );
  }

  /**
   * ingest data from any of the aggregated Transport instances into TransportDevice instances
   * @private
   * @param {(Buffer|null)} identifier identifier buffer
   * @param {Buffer} payload payload buffer
   * @returns {void}
   */
  _ingestIntoDeviceInstances(identifier, payload) {
    const { devices } = this.state;

    devices.forEach((device) => {
      device.ingestIntoDeviceInstances(identifier, payload);
    });
  }

  /**
   * set the online status of all devices on this transport to true
   * @returns {void}
   */
  _setOnline() {
    const { devices } = this.state;

    devices.forEach((device) => {
      device.setOnline();
    });
  }

  /**
   * set the online status of all devices on this transport to false
   * @returns {void}
   */
  _setOffline() {
    const { devices } = this.state;

    devices.forEach((device) => {
      device.setOffline();
    });
  }

  /**
   * add an instance of Device to this transport
   * @param {Device} device instance of Device
   * @returns {TransportDevice} instance of TransportDevice
   */
  addDevice(device) {
    const { devices } = this.state;

    const transportDevice = new TransportDevice(this, device);
    devices.add(transportDevice);

    return transportDevice;
  }

  /**
   * connect all of the aggregated Transport instances
   * @returns {void}
   */
  connect() {
    const { transports } = this.state;

    transports.forEach((transport) => {
      transport.connect();
    });
  }

  /**
   * disconnect all of the aggregated Transport instances
   * @returns {void}
   */
  disconnect() {
    const { transports } = this.state;

    transports.forEach((transport) => {
      transport.disconnect();
    });
  }

  /**
   * reconnect all of the aggregated Transport instances
   * @returns {void}
   */
  reconnect() {
    const { transports } = this.state;

    transports.forEach((transport) => {
      transport.reconnect();
    });
  }

  /**
   * write from AggregatedTransport instance to network (of all aggregated Transport instances)
   * @param {(Buffer|null)} identifier identifier buffer
   * @param {Buffer} payload payload buffer
   * @returns {void}
   */
  write(identifier, payload) {
    const { transports } = this.state;

    transports.forEach((transport) => {
      transport.write(identifier, payload);
    });
  }
}

module.exports = {
  AggregatedTransport,
  Transport
};
