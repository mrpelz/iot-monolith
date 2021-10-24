import {
  bitLengthPayload,
  byteLengthAddress,
  maxAddress,
  maxPayload,
} from '../device/ev1527.js';
import { Event } from '../device/main.js';

export type Ev1527Payload = {
  data: Buffer;
  deviceIdentifier: Buffer;
  protocol: 1;
};

export type Rf433Payload = {
  protocol: number;
  value: number;
} & Ev1527Payload;

export class Rf433 extends Event<Rf433Payload> {
  constructor() {
    super(Buffer.from([0xfc]));
  }

  protected decode(input: Buffer): Rf433Payload | null {
    if (input.length < 5) return null;

    const protocol = input.subarray(0, 1).readUInt8(); // 1.
    const value = input.subarray(1, 5).readUInt32LE(); // 2.

    if (protocol !== 1) return null;

    // eslint-disable-next-line no-bitwise
    const _deviceIdentifier = value >> bitLengthPayload;
    if (_deviceIdentifier > maxAddress) return null;

    // eslint-disable-next-line no-bitwise
    const _data = value & maxPayload;
    if (_data > maxPayload) return null;

    const deviceIdentifier = Buffer.alloc(byteLengthAddress);
    deviceIdentifier.writeUIntBE(_deviceIdentifier, 0, byteLengthAddress);

    const data = Buffer.of(_data);

    return {
      data,
      deviceIdentifier,
      protocol,
      value,
    };
  }
}
