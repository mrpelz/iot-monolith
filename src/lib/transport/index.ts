import { BooleanState } from '../state/index.js';
import { Device } from '../device/index.js';
import { ReadOnlyObservable } from '../observable/index.js';
import { logger } from '../../app/logging.js';

export class TransportDevice {
  static _isValidDeviceForTransport(
    devices: Set<TransportDevice>,
    device: Device
  ): void {
    for (const previousTransportDevice of devices) {
      const previousDeviceIdentifier =
        previousTransportDevice.device.identifier;

      if (
        previousDeviceIdentifier &&
        device.identifier &&
        previousDeviceIdentifier.equals(device.identifier)
      ) {
        throw new Error(
          `cannot use the same identifier for multiple devices (${device.identifier})`
        );
      }
    }
  }

  private readonly _transport: Transport;

  readonly device: Device;
  readonly isConnected: ReadOnlyObservable<boolean>;

  constructor(transport: Transport, device: Device) {
    this._transport = transport;
    this.device = device;
    this.isConnected = transport.isConnected;
  }

  /**
   * write data from Transport instance to Device instance
   */
  _ingestIntoDeviceInstance(identifier: Buffer | null, payload: Buffer): void {
    if (this._transport.identifierLength) {
      if (
        !identifier ||
        this._transport.identifierLength !== identifier.length
      ) {
        throw new Error(
          'incoming message identifier has wrong length for device'
        );
      }

      if (
        this.device.identifier &&
        !identifier.equals(this.device.identifier)
      ) {
        return;
      }
    }

    this.device.matchDataToRequest(payload);
  }

  /**
   * write data from Device instance to Transport instance
   */
  _writeToTransport(payload: Buffer): void {
    this._transport.writeToNetwork(
      this._transport.identifierLength ? this.device.identifier : null,
      payload
    );
  }
}

export class Transport {
  private readonly _devices = new Set<TransportDevice>();
  private readonly _log = logger.getInput({ head: 'Transport' });
  private readonly _singleDevice: boolean;

  protected readonly _isConnected = new BooleanState(false);

  readonly identifierLength: number;
  readonly isConnected: ReadOnlyObservable<boolean>;

  constructor(identifierLength = 0, singleDevice = true) {
    if (!singleDevice && !identifierLength) {
      throw new Error('identifier is required for multi device transport');
    }

    this._singleDevice = singleDevice;

    this.identifierLength = identifierLength;
    this.isConnected = new ReadOnlyObservable(this._isConnected);
  }

  /**
   * ingest data from transport into TransportDevice instances
   */
  protected _ingestIntoDeviceInstances(
    identifier: Buffer | null,
    payload: Buffer
  ): void {
    for (const device of this._devices) {
      device._ingestIntoDeviceInstance(identifier, payload);
    }
  }

  /**
   * add an instance of Device to this transport
   */
  addDevice(device: Device): TransportDevice {
    if (this._singleDevice && this._devices.size >= 1) {
      throw new Error('can only add one device to single device transport');
    }

    if (
      device.identifier &&
      this.identifierLength !== device.identifier.length
    ) {
      throw new Error('device identifier has wrong length for transport');
    }

    TransportDevice._isValidDeviceForTransport(this._devices, device);

    const transportDevice = new TransportDevice(this, device);
    this._devices.add(transportDevice);

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
    this._devices.delete(transportDevice);
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
