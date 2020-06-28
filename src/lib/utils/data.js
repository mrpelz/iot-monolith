import { randomFillSync } from 'crypto';

export const emptyBuffer = Buffer.from([]);
export const falseBuffer = Buffer.from([0]);
export const trueBuffer = Buffer.from([1]);

export function arrayPadLeft(input, length, value = null) {
  if (typeof input !== 'object' || !Array.isArray(input)) {
    throw new Error('input is not an array');
  }

  while (input.length < length) {
    input.unshift(value);
  }

  return input;
}

export function arrayPadRight(input, length, value = null) {
  if (typeof input !== 'object' || !Array.isArray(input)) {
    throw new Error('input is not an array');
  }

  while (input.length >= length) {
    input.push(value);
  }

  return input;
}

export function concatBytes(input) {
  return Buffer.concat(input.map((byte) => {
    return Buffer.from([byte]);
  }));
}

export function humanPayload(input) {
  const payload = [...input];

  return [
    payload.map((byte) => {
      const byteString = byte.toString(2).padStart(8, '0');
      return (`0b${byteString}`).padStart(10, ' ');
    }).join(' | '),
    payload.map((byte) => {
      const byteString = byte.toString(10);
      return byteString.padStart(10, ' ');
    }).join(' | '),
    payload.map((byte) => {
      const byteString = byte.toString(16).padStart(2, '0');
      return (`0x${byteString}`).padStart(10, ' ');
    }).join(' | ')
  ].join('\n');
}

export function numberToDigits(input, pad = 0, radix = 10) {
  if (typeof input !== 'number') {
    throw new Error('input not a number');
  }

  const number = Math.abs(input);

  if (Math.floor(number) !== number) {
    throw new Error('input not an integer');
  }

  return number.toString(radix).padStart(pad, '0').split('').map((x) => {
    return Number.parseInt(x, radix);
  });
}

export function randomString(length = 2) {
  const cache = Buffer.alloc(Math.max(1, length / 2));
  return randomFillSync(cache).toString('hex');
}

/**
 *
 * @param {Buffer} input input
 * @param {number} bytes byte count
 * @returns {number}
 */
export function readNumber(input, bytes = 1) {
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
}

export function booleanToBuffer(input) {
  return input ? trueBuffer : falseBuffer;
}

export function bufferToBoolean(input) {
  return Boolean(readNumber(input, 1));
}

export function swapByte(input) {
  let byte = input;
  /* eslint-disable no-bitwise */
  byte = ((byte & 0b11110000) >> 4) | ((byte & 0b1111) << 4);
  byte = ((byte & 0b11001100) >> 2) | ((byte & 0b110011) << 2);
  byte = ((byte & 0b10101010) >> 1) | ((byte & 0b1010101) << 1);
  /* eslint-enable no-bitwise */
  return byte;
}

export function writeNumber(input, bytes = 1) {
  if ((input < 0) || (input >= 2 ** (bytes * 8))) {
    throw new Error('number cannot be represented');
  }

  const cache = Buffer.alloc(bytes);

  switch (bytes) {
    case 1:
      cache.writeUInt8(input, 0);
      break;
    case 2:
      cache.writeUInt16LE(input, 0);
      break;
    case 4:
      cache.writeUInt32LE(input, 0);
      break;
    default:
      throw new Error('illegal number of bytes specified');
  }
  return cache;
}
