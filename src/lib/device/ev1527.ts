import {
  bitRange,
  bytesRequiredForBitLength,
} from '../rolling-number/index.js';
import { Device } from './index.js';
import { Ev1527Transport } from '../transport/ev1527.js';

export const bitLengthAddress = 20;
export const bitLengthPayload = 4;

export const byteLengthAddress = bytesRequiredForBitLength(bitLengthAddress);

export const maxAddress = bitRange(bitLengthAddress);
export const maxPayload = bitRange(bitLengthPayload);

export class Ev1527Device extends Device {
  constructor(transport: Ev1527Transport, address: number) {
    if (address > maxAddress) throw new RangeError('address to big');

    const deviceIdentifier = Buffer.alloc(byteLengthAddress);
    // eslint-disable-next-line no-bitwise
    deviceIdentifier.writeUIntBE(address, 0, byteLengthAddress);

    super(transport, deviceIdentifier, 0);
  }
}
