import { Logger } from '../log.js';
import { bitRange, bytesRequiredForBitLength } from '../number.js';
import { Ev1527Transport } from '../transport/ev1527.js';
import { Device } from './main.js';

export const bitLengthAddress = 20;
export const bitLengthPayload = 4;

export const byteLengthAddress = bytesRequiredForBitLength(bitLengthAddress);

export const maxAddress = bitRange(bitLengthAddress);
export const maxPayload = bitRange(bitLengthPayload);

export class Ev1527Device extends Device<Ev1527Transport> {
  constructor(logger: Logger, transport: Ev1527Transport, address: number) {
    if (address > maxAddress) throw new RangeError('address too big');

    const deviceIdentifier = Buffer.alloc(byteLengthAddress);

    deviceIdentifier.writeUIntBE(address, 0, byteLengthAddress);

    super(logger, transport, deviceIdentifier, false);
  }
}
