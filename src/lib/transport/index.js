const { Logger } = require('../log');
const { rebind } = require('../utils/oop');
const { emptyBuffer } = require('../utils/data');

const libName = 'transport';

class TransportDevice {
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
      } = previousTransportDevice.device.state;

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
      if (transportIdentifier.length !== identifier.length) {
        throw new Error('incoming message identifier has wrong length for device');
      }

      if (!identifier.equals(deviceIdentifier.length)) return;
    }

    device.ingest(payload);
  }

  setOnline() {
    const {
      device
    } = this.state;

    device.setOnline();
  }

  setOffline() {
    const {
      device
    } = this.state;

    device.setOffline();
  }
}

class Transport {
  constructor(options = {}) {
    const {
      devices = new Set(),
      singleDevice = true,
      identifier = emptyBuffer
    } = options;

    if (
      devices === undefined
      || singleDevice === undefined
      || identifier === undefined
    ) {
      throw new Error('insufficient options provided');
    }

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

  _ingestIntoDeviceInstances(identifier, payload) {
    const { devices } = this.state;

    // const identifier = identifierLength ? data.subarray(0, identifierLength) : null;
    // const payload = data.subarray(identifierLength);

    devices.forEach((device) => {
      device.ingestIntoDeviceInstances(identifier, payload);
    });
  }

  _setOnline() {
    const { devices } = this.state;

    devices.forEach((device) => {
      device.setOnline();
    });
  }

  _setOffline() {
    const { devices } = this.state;

    devices.forEach((device) => {
      device.setOffline();
    });
  }

  addDevice(device) {
    const { devices, singleDevice } = this.state;

    if (singleDevice && devices.size >= 1) {
      throw new Error('can only add one device to single device transport');
    }

    const transportDevice = new TransportDevice(this, device);
    devices.add(transportDevice);

    return transportDevice;
  }

  connect() {
    throw new Error(
      `no connect method defined in ${this}`
    );
  }

  disconnect() {
    throw new Error(
      `no disconnect method defined in ${this}`
    );
  }

  reconnect() {
    throw new Error(
      `no reconnect method defined in ${this}`
    );
  }

  write(identifier, payload) {
    throw new Error(
      `no write method defined in ${this} to process identifier "${identifier}" and payload "${payload}"`
    );
  }
}

class AggregatedTransport {
  static createSubTransports(SubTransport, parentOptions, transportOptions) {
    return transportOptions.map((transportOption) => {
      return new SubTransport({
        ...transportOption,
        ...parentOptions
      });
    });
  }

  constructor(options = {}, SubTransport, ...transportOptions) {
    const {
      devices = new Set(),
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

  _ingestIntoDeviceInstances(identifier, payload) {
    const { devices } = this.state;

    devices.forEach((device) => {
      device.ingestIntoDeviceInstances(identifier, payload);
    });
  }

  _setOnline() {
    const { devices } = this.state;

    devices.forEach((device) => {
      device.setOnline();
    });
  }

  _setOffline() {
    const { devices } = this.state;

    devices.forEach((device) => {
      device.setOffline();
    });
  }

  addDevice(device) {
    const { devices } = this.state;

    const transportDevice = new TransportDevice(this, device);
    devices.add(transportDevice);

    return transportDevice;
  }

  connect() {
    const { transports } = this.state;

    transports.forEach((transport) => {
      transport.connect();
    });
  }

  disconnect() {
    const { transports } = this.state;

    transports.forEach((transport) => {
      transport.disconnect();
    });
  }

  reconnect() {
    const { transports } = this.state;

    transports.forEach((transport) => {
      transport.reconnect();
    });
  }

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
