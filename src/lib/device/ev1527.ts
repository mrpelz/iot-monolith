import { bitRange, bytesRequiredForBitLength } from '../rolling-number.js';
import { Device } from './main.js';
import { Ev1527Transport } from '../transport/ev1527.js';
import { Logger } from '../log.js';

export const bitLengthAddress = 20;
export const bitLengthPayload = 4;

export const byteLengthAddress = bytesRequiredForBitLength(bitLengthAddress);

export const maxAddress = bitRange(bitLengthAddress);
export const maxPayload = bitRange(bitLengthPayload);

export class Ev1527Device extends Device<Ev1527Transport> {
  constructor(logger: Logger, transport: Ev1527Transport, address: number) {
    if (address > maxAddress) throw new RangeError('address too big');

    const deviceIdentifier = Buffer.alloc(byteLengthAddress);
    // eslint-disable-next-line no-bitwise
    deviceIdentifier.writeUIntBE(address, 0, byteLengthAddress);

    super(logger, transport, deviceIdentifier, false);
  }
}
