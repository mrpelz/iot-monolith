import { TCPTransport, TCPTransportOptions } from './tcp.js';
import { UDPTransport, UDPTransportOptions } from './udp.js';
import { BooleanState } from '../state/index.js';
import { Device } from '../device/index.js';
import { Input } from '../log/index.js';
import { logger } from '../../app/logging.js';
import { rebind } from '../utils/oop.js';

export type AnyTransport =
  | Transport
  | AggregatedTransport
  | TCPTransport
  | UDPTransport;

type TransportDevices = Set<TransportDevice>;

type TransportState = {
  devices: TransportDevices;
  identifier: Buffer | null;
  isConnected: BooleanState;
  log: Input;
  singleDevice: boolean;
};

type AggregatedTransportState = Omit<TransportState, 'singleDevice'> & {
  log: Input;
  transports: AnyTransport[];
};

export type TransportOptions = {
  devices?: TransportState['devices'];
  identifier?: TransportState['identifier'];
  singleDevice?: TransportState['singleDevice'];
};

type AnyTransportOptions =
  | TransportOptions
  | TCPTransportOptions
  | UDPTransportOptions;

type TransportDeviceState = {
  device: Device;
  transport: AnyTransport;
};

export class TransportDevice {
  state: TransportDeviceState;

  constructor(transport: AnyTransport, device: Device) {
    const {
      state: { devices, identifier: transportIdentifier },
    } = transport;

    const {
      state: { identifier: deviceIdentifier },
    } = device;

    if (
      transportIdentifier &&
      transportIdentifier.length !== deviceIdentifier?.length
    ) {
      throw new Error('device identifier has wrong length for transport');
    }

    if (transportIdentifier && deviceIdentifier?.equals(transportIdentifier)) {
      throw new Error('cannot use same identifier on transport and device');
    }

    devices.forEach((previousTransportDevice) => {
      const {
        state: {
          device: {
            state: { identifier: previousDeviceIdentifier },
          },
        },
      } = previousTransportDevice;

      if (
        previousDeviceIdentifier &&
        deviceIdentifier &&
        previousDeviceIdentifier.equals(deviceIdentifier)
      ) {
        throw new Error(
          `cannot use the same identifier for multiple devices (${deviceIdentifier})`
        );
      }
    });

    this.state = {
      device,
      transport,
    };

    rebind(this, 'ingestIntoDeviceInstance', 'writeToTransport');
  }

  /**
   * write data from Transport instance to Device instance
   */
  ingestIntoDeviceInstance(identifier: Buffer | null, payload: Buffer): void {
    const {
      transport: {
        state: { identifier: transportIdentifier },
      },
      device,
      device: {
        state: { identifier: deviceIdentifier },
      },
    } = this.state;

    if (transportIdentifier) {
      if (!identifier || transportIdentifier.length !== identifier.length) {
        throw new Error(
          'incoming message identifier has wrong length for device'
        );
      }

      if (deviceIdentifier && !identifier.equals(deviceIdentifier)) return;
    }

    device.matchDataToRequest(payload);
  }

  /**
   * write data from Device instance to Transport instance
   */
  writeToTransport(payload: Buffer): void {
    const {
      transport,
      transport: {
        state: { identifier: transportIdentifier },
      },
      device: {
        state: { identifier: deviceIdentifier },
      },
    } = this.state;

    transport.writeToNetwork(
      transportIdentifier ? deviceIdentifier : null,
      payload
    );
  }
}

export class Transport {
  state: TransportState;

  constructor(options: TransportOptions) {
    const {
      devices = new Set(),
      identifier = null,
      singleDevice = true,
    } = options;

    if (!singleDevice && !identifier) {
      throw new Error('identifier is required for multi device transport');
    }

    rebind(
      this,
      'addDevice',
      'connect',
      'disconnect',
      'reconnect',
      'removeDevice',
      'writeToNetwork'
    );

    this.state = {
      devices,
      identifier,
      isConnected: new BooleanState(false),
      log: logger.getInput({
        head: 'Transport',
      }),
      singleDevice,
    };

    this.state.isConnected.observe(() =>
      this.state.devices.forEach((device) => {
        device.state.device.onOnlineChange();
      })
    );
  }

  /**
   * ingest data from transport into TransportDevice instances
   */
  _ingestIntoDeviceInstances(identifier: Buffer | null, payload: Buffer): void {
    this.state.devices.forEach((device) => {
      device.ingestIntoDeviceInstance(identifier, payload);
    });
  }

  /**
   * set the online status of all devices on this transport
   */
  _setConnected(online: boolean): void {
    this.state.isConnected.value = online;
  }

  /**
   * add an instance of Device to this transport
   */
  addDevice(device: Device): TransportDevice {
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
  connect(): void {
    throw new Error(`no connect method defined in ${this}`);
  }

  /**
   * disconnect Transport instance – placeholder
   */
  disconnect(): void {
    throw new Error(`no disconnect method defined in ${this}`);
  }

  /**
   * reconnect Transport instance – placeholder
   */
  reconnect(): void {
    throw new Error(`no reconnect method defined in ${this}`);
  }

  /**
   * remove an instance of TransportDevice from this transport
   */
  removeDevice(transportDevice: TransportDevice): void {
    transportDevice.state.device.transport = (null as unknown) as TransportDevice;
    this.state.devices.delete(transportDevice);
  }

  /**
   * write from Transport instance to network – placeholder
   */
  writeToNetwork(deviceIdentifier: Buffer | null, payload: Buffer): void {
    throw new Error(
      `no write method defined in ${this} to process identifier "${deviceIdentifier}" and payload "${payload}"`
    );
  }
}

export class AggregatedTransport {
  state: AggregatedTransportState;

  static createSubTransports(
    SubTransport: new (options: AnyTransportOptions) => AnyTransport,
    parentOptions: AnyTransportOptions,
    transportOptions: AnyTransportOptions[]
  ): AnyTransport[] {
    return transportOptions.map((transportOption) => {
      return new SubTransport({
        ...transportOption,
        ...parentOptions,
      });
    });
  }

  constructor(
    options: AnyTransportOptions,
    SubTransport: new (args: AnyTransportOptions) => AnyTransport,
    ...transportOptions: AnyTransportOptions[]
  ) {
    const { devices = new Set(), identifier } = options;

    if (!SubTransport || !devices || !identifier) {
      throw new Error('insufficient options provided');
    }

    if (!identifier) {
      throw new Error('identifier is required for aggregate transport');
    }

    rebind(
      this,
      'addDevice',
      'connect',
      'disconnect',
      'reconnect',
      'removeDevice',
      'writeToTransport'
    );

    this.state = {
      devices,
      identifier,
      isConnected: new BooleanState(false),
      log: logger.getInput({
        head: 'AggregatedTransport',
      }),
      transports: AggregatedTransport.createSubTransports(
        SubTransport,
        options,
        transportOptions
      ),
    };

    this.state.isConnected.observe(() =>
      this.state.devices.forEach((device) => {
        device.state.device.onOnlineChange();
      })
    );
  }

  /**
   * ingest data from any of the aggregated Transport instances into TransportDevice instances
   */
  _ingestIntoDeviceInstances(identifier: Buffer | null, payload: Buffer): void {
    this.state.devices.forEach((device) => {
      device.ingestIntoDeviceInstance(identifier, payload);
    });
  }

  /**
   * set the online status of all devices on this transport
   */
  _setOnline(online: boolean): void {
    this.state.isConnected.value = online;
  }

  /**
   * add an instance of Device to this transport
   */
  addDevice(device: Device): TransportDevice {
    const transportDevice = new TransportDevice(this, device);
    this.state.devices.add(transportDevice);

    return transportDevice;
  }

  /**
   * connect all of the aggregated Transport instances
   */
  connect(): void {
    this.state.transports.forEach((transport) => {
      transport.connect();
    });
  }

  /**
   * disconnect all of the aggregated Transport instances
   */
  disconnect(): void {
    this.state.transports.forEach((transport) => {
      transport.disconnect();
    });
  }

  /**
   * reconnect all of the aggregated Transport instances
   */
  reconnect(): void {
    this.state.transports.forEach((transport) => {
      transport.reconnect();
    });
  }

  /**
   * remove an instance of TransportDevice from this transport
   */
  removeDevice(transportDevice: TransportDevice): void {
    transportDevice.state.device.transport = (null as unknown) as TransportDevice;
    this.state.devices.delete(transportDevice);
  }

  /**
   * write from AggregatedTransport instance to network (of all aggregated Transport instances)
   */
  writeToNetwork(deviceIdentifier: Buffer | null, payload: Buffer): void {
    this.state.transports.forEach((transport) => {
      transport.writeToNetwork(deviceIdentifier, payload);
    });
  }
}
