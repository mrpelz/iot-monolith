import { randomFillSync } from 'crypto';

export const emptyBuffer = Buffer.from([]);
export const falseBuffer = Buffer.of(0);
export const trueBuffer = Buffer.of(1);

export const arrayPadLeft = <T>(
  input: T[],
  length: number,
  value: T = null as unknown as T
): T[] => {
  while (input.length < length) {
    input.unshift(value);
  }

  return input;
};

export const bufferChunks = (input: Buffer, chunkSize = 1): Buffer[] => {
  if (input.length < chunkSize) throw new Error('input buffer too small');

  const result: Buffer[] = [];

  for (let offset = 0; offset < input.length; offset += chunkSize) {
    result.push(input.subarray(offset, offset + chunkSize));
  }

  return result;
};

export const arrayPadRight = <T>(
  input: T[],
  length: number,
  value: T = null as unknown as T
): T[] => {
  while (input.length >= length) {
    input.push(value);
  }

  return input;
};

export const concatBytes = (input: number[]): Buffer => Buffer.from(input);

export const humanPayload = (input: Buffer): string => {
  const payload = [...input];

  return [
    payload
      .map((byte) => {
        const byteString = byte.toString(2).padStart(8, '0');
        return `0b${byteString}`.padStart(10, ' ');
      })
      .join(' | '),
    payload
      .map((byte) => {
        const byteString = byte.toString(10);
        return byteString.padStart(10, ' ');
      })
      .join(' | '),
    payload
      .map((byte) => {
        const byteString = byte.toString(16).padStart(2, '0');
        return `0x${byteString}`.padStart(10, ' ');
      })
      .join(' | '),
  ].join('\n');
};

export const numberToDigits = (
  input: number,
  pad = 0,
  radix = 10
): number[] => {
  const number = Math.abs(input);

  if (Math.floor(number) !== number) {
    throw new Error('input not an integer');
  }

  return number
    .toString(radix)
    .padStart(pad, '0')
    .split('')
    .map((x) => Number.parseInt(x, radix));
};

export const randomString = (length = 2): string => {
  const cache = Buffer.alloc(Math.max(1, length / 2));
  return randomFillSync(cache).toString('hex');
};

export const readNumber = (input: Buffer, bytes = 1): number => {
  if (input.length < bytes) {
    throw new Error('number cannot be represented');
  }

  switch (bytes) {
    case 1:
      return input.readUInt8(0);
    case 2:
      return input.readUInt16LE(0);
    case 4:
      return input.readUInt32LE(0);
    default:
      throw new Error('illegal number of bytes specified');
  }
};

export const booleanToBuffer = (input: boolean): Buffer =>
  input ? trueBuffer : falseBuffer;

export const bufferToBoolean = (input: Buffer): boolean =>
  Boolean(readNumber(input, 1));

export const swapByte = (input: number): number => {
  let byte = input;
  /* eslint-disable no-bitwise */
  byte = ((byte & 0b11110000) >> 4) | ((byte & 0b1111) << 4);
  byte = ((byte & 0b11001100) >> 2) | ((byte & 0b110011) << 2);
  byte = ((byte & 0b10101010) >> 1) | ((byte & 0b1010101) << 1);
  /* eslint-enable no-bitwise */
  return byte;
};

export const writeNumber = (input: number, bytes = 1): Buffer => {
  if (input < 0 || input >= 2 ** (bytes * 8)) {
    throw new Error('number cannot be represented');
  }

  const cache = Buffer.alloc(bytes);

  switch (bytes) {
    case 1:
      cache.writeUInt8(input);
      break;
    case 2:
      cache.writeUInt16LE(input);
      break;
    case 4:
      cache.writeUInt32LE(input);
      break;
    default:
      throw new Error('illegal number of bytes specified');
  }
  return cache;
};
