const emptyBuffer = Buffer.from([]);

function arraysToObject(keyArray, valueArray) {
  if (!Array.isArray(keyArray) || !Array.isArray(valueArray)) {
    throw new Error('inputs are not arrays');
  }
  if (keyArray.length !== valueArray.length) {
    throw new Error('array lengths do not match');
  }

  const result = {};

  keyArray.forEach((key, index) => {
    result[key] = valueArray[index];
  });

  return result;
}

function readNumber(input, bytes) {
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

function sanity(input, options) {
  const {
    divide = 1,
    max = Number.POSITIVE_INFINITY,
    min = Number.NEGATIVE_INFINITY,
    multiply = 1,
    offset = 0
  } = options;

  if (input > max) return null;
  if (input < min) return null;

  let value = input;

  value += offset;
  value /= divide;
  value *= multiply;

  return value;
}

function writeNumber(input, bytes) {
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

module.exports = {
  arraysToObject,
  emptyBuffer,
  readNumber,
  sanity,
  writeNumber
};
