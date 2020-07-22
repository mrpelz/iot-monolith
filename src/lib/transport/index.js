import { Logger } from '../log/index.js';
import { rebind } from '../utils/oop.js';

/**
 * @typedef I_Device
 * @type {InstanceType<import('../device/index.js')['Device']>}
 */

/**
 * @typedef I_TCPTransport
 * @type {InstanceType<import('./tcp.js')['TCPTransport']>}
 */

/**
 * @typedef I_TCPTransportOptions
 * @type {import('./tcp.js').TCPTransportOptions}
 */

/**
 * @typedef I_UDPTransport
 * @type {InstanceType<import('./udp.js')['UDPTransport']>}
 */

/**
 * @typedef I_UDPTransportOptions
 * @type {import('./udp.js').UDPTransportOptions}
 */

/**
 * @typedef AnyTransport
 * @type {Transport|AggregatedTransport|I_TCPTransport|I_UDPTransport}
 */

/**
 * @typedef TransportDevices
 * @type {Set<TransportDevice>}
 */

/**
 * @typedef TransportOptions
 * @type {{
 *  devices?: TransportDevices,
 *  identifier?: (Buffer|null),
 *  singleDevice?: boolean
 * }}
 */

/**
 * @typedef AnyTransportOptions
 * @type {TransportOptions|I_TCPTransportOptions|I_UDPTransportOptions}
 */

const libName = 'transport';

/**
 * @class TransportDevice
 */
export class TransportDevice {

  /**
   * create instance of TransportDevice
   * @param {AnyTransport} transport Transport instance
   * @param {I_Device} device Device instance
   */
  constructor(transport, device) {
    const {
      state: {
        devices,
        identifier: transportIdentifier
      }
    } = transport;

    const {
      state: {
        identifier: deviceIdentifier
      }
    } = device;

    if (
      transportIdentifier && transportIdentifier.length !== deviceIdentifier.length
    ) {
      throw new Error('device identifier has wrong length for transport');
    }

    if (transportIdentifier && deviceIdentifier.equals(transportIdentifier)) {
      throw new Error('cannot use same identifier on transport and device');
    }

    devices.forEach((previousTransportDevice) => {
      const {
        state: {
          device: {
            state: {
              identifier: previousDeviceIdentifier
            }
          }
        }
      } = previousTransportDevice;

      if (previousDeviceIdentifier.equals(deviceIdentifier)) {
        throw new Error(
          `cannot use the same identifier for multiple devices (${deviceIdentifier})`
        );
      }
    });

    /**
     * @type {{
     *  transport: AnyTransport,
     *  device: I_Device
     * }}
     */
    this.state = {
      transport,
      device
    };

    rebind(
      this,
      'ingestIntoDeviceInstance',
      'writeToTransport'
    );
  }

  /**
   * write data from Transport instance to Device instance
   * @param {Buffer|null} identifier identifier buffer
   * @param {Buffer} payload payload buffer
   */
  ingestIntoDeviceInstance(identifier, payload) {
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

    if (transportIdentifier) {
      if (!identifier || transportIdentifier.length !== identifier.length) {
        throw new Error('incoming message identifier has wrong length for device');
      }

      if (!identifier.equals(deviceIdentifier)) return;
    }

    device.matchDataToRequest(payload);
  }

  /**
   * write data from Device instance to Transport instance
   * @param {Buffer} payload payload buffer
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

    transport.writeToNetwork(transportIdentifier ? deviceIdentifier : null, payload);
  }
}

/**
  * @class Transport
  */
export class Transport {

  /**
   * create instance of Transport
   * @param {TransportOptions} options configuration object
   */
  constructor(options) {
    const {
      devices = /** @type {TransportDevices} */ (new Set()),
      identifier,
      singleDevice = true
    } = options;

    if (!singleDevice && !identifier) {
      throw new Error('identifier is required for multi device transport');
    }

    this.log = new Logger();

    this.log.friendlyName('base transport');

    /**
     * @type {TransportOptions & {
     *  isConnected: boolean | null,
     *  log: ReturnType<import('../log/index.js').Logger['withPrefix']>
     * }}
     */
    this.state = {
      devices,
      identifier,
      isConnected: null,
      log: this.log.withPrefix(libName),
      singleDevice
    };

    rebind(
      this,
      'addDevice',
      'connect',
      'disconnect',
      'reconnect',
      'removeDevice',
      'writeToNetwork'
    );
  }

  /**
   * ingest data from transport into TransportDevice instances
   * @param {Buffer|null} identifier identifier buffer
   * @param {Buffer} payload payload buffer
   */
  _ingestIntoDeviceInstances(identifier, payload) {
    this.state.devices.forEach((device) => {
      device.ingestIntoDeviceInstance(identifier, payload);
    });
  }

  /**
   * set the online status of all devices on this transport
   * @param {boolean} online
   */
  _setConnected(online) {
    this.state.isConnected = online;

    this.state.devices.forEach((device) => {
      device.state.device.onOnlineChange();
    });
  }

  /**
   * add an instance of Device to this transport
   * @param {I_Device} device instance of Device
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
   */
  connect() {
    throw new Error(
      `no connect method defined in ${this}`
    );
  }

  /**
   * disconnect Transport instance – placeholder
   */
  disconnect() {
    throw new Error(
      `no disconnect method defined in ${this}`
    );
  }

  /**
   * reconnect Transport instance – placeholder
   */
  reconnect() {
    throw new Error(
      `no reconnect method defined in ${this}`
    );
  }

  /**
   * remove an instance of TransportDevice from this transport
   * @param {TransportDevice} transportDevice instance of TransportDevice
   */
  removeDevice(transportDevice) {
    transportDevice.state.device.transport = null;
    this.state.devices.delete(transportDevice);
  }

  /**
   * write from Transport instance to network – placeholder
   * @param {(Buffer|null)} deviceIdentifier device identifier buffer
   * @param {Buffer} payload payload buffer
   */
  writeToNetwork(deviceIdentifier, payload) {
    throw new Error(
      `no write method defined in ${this} to process identifier "${deviceIdentifier}" and payload "${payload}"`
    );
  }
}

/**
 * @class AggregatedTransport
 */
export class AggregatedTransport {

  /**
   * create dataset of SubTransports
   * @param {Object} SubTransport transport class to be instantiated
   * @param {AnyTransportOptions} parentOptions configuration object
   * @param {AnyTransportOptions[]} transportOptions array of configuration objects
   * @returns {AnyTransport[]} array of Transport instances
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
   * @param {AnyTransportOptions} options configuration object
   * @param {Object} SubTransport transport class to be instantiated
   * @param  {...AnyTransportOptions} transportOptions transport configuration objects
   */
  constructor(options, SubTransport, ...transportOptions) {
    const {
      devices = /** @type {TransportDevices} */ (new Set()),
      identifier
    } = options;

    if (
      !SubTransport
      || !devices
      || !identifier
    ) {
      throw new Error('insufficient options provided');
    }

    if (!identifier) {
      throw new Error('identifier is required for aggregate transport');
    }

    this.log = new Logger();

    this.log.friendlyName('aggregated transport');

    /**
     * @type {AnyTransportOptions & {
     *  transports: AnyTransport[],
     *  isConnected: boolean | null,
     *  log: ReturnType<import('../log/index.js').Logger['withPrefix']>
     * }}
     */
    this.state = {
      transports: AggregatedTransport.createSubTransports(
        SubTransport,
        options,
        transportOptions
      ),
      devices,
      identifier,
      isConnected: null,
      log: this.log.withPrefix(libName)
    };

    rebind(
      this,
      'addDevice',
      'connect',
      'disconnect',
      'reconnect',
      'removeDevice',
      'writeToTransport'
    );
  }

  /**
   * ingest data from any of the aggregated Transport instances into TransportDevice instances
   * @param {Buffer|null} identifier identifier buffer
   * @param {Buffer} payload payload buffer
   */
  _ingestIntoDeviceInstances(identifier, payload) {
    this.state.devices.forEach((device) => {
      device.ingestIntoDeviceInstance(identifier, payload);
    });
  }

  /**
   * set the online status of all devices on this transport
   * @param {boolean} online
   */
  _setOnline(online) {
    this.state.isConnected = online;

    this.state.devices.forEach((device) => {
      device.state.device.onOnlineChange();
    });
  }

  /**
   * add an instance of Device to this transport
   * @param {I_Device} device instance of Device
   */
  addDevice(device) {
    const transportDevice = new TransportDevice(this, device);
    this.state.devices.add(transportDevice);

    return transportDevice;
  }

  /**
   * connect all of the aggregated Transport instances
   */
  connect() {
    this.state.transports.forEach((transport) => {
      transport.connect();
    });
  }

  /**
   * disconnect all of the aggregated Transport instances
   */
  disconnect() {
    this.state.transports.forEach((transport) => {
      transport.disconnect();
    });
  }

  /**
   * reconnect all of the aggregated Transport instances
   */
  reconnect() {
    this.state.transports.forEach((transport) => {
      transport.reconnect();
    });
  }

  /**
   * remove an instance of TransportDevice from this transport
   * @param {TransportDevice} transportDevice instance of TransportDevice
   */
  removeDevice(transportDevice) {
    transportDevice.state.device.transport = null;
    this.state.devices.delete(transportDevice);
  }

  /**
   * write from AggregatedTransport instance to network (of all aggregated Transport instances)
   * @param {Buffer|null} deviceIdentifier device identifier buffer
   * @param {Buffer} payload payload buffer
   */
  writeToNetwork(deviceIdentifier, payload) {
    this.state.transports.forEach((transport) => {
      transport.writeToNetwork(deviceIdentifier, payload);
    });
  }
}
