const { MessageClient } = require('../messaging');
const { bufferToBoolean, numberToDigits, sanity } = require('../utils/data');
const { rebind } = require('../utils/oop');
const { Logger } = require('../log');

const logPrefix = 'seven-segment';
const { log } = new Logger(logPrefix);

const displayLength = 4;
const signLength = 1;
const negativeDisplayLength = displayLength - signLength;

const empty = 0;
const minus = 1;

const digitMap = [
  0b1111110,
  0b0110000,
  0b1101101,
  0b1111001,
  0b0110011,
  0b1011011,
  0b1011111,
  0b1110000,
  0b1111111,
  0b1111011
];

const letterMap = {
  a: 0b1110111,
  b: 0b0011111,
  c: 0b1001110,
  d: 0b0111101,
  e: 0b1001111,
  f: 0b1000111
};

const emptyDisplay = Array(displayLength).fill(empty);

/* eslint-disable-next-line no-bitwise */
const minNumber = ~((digitMap.length ** negativeDisplayLength) - 1) + 1;
const maxNumber = (digitMap.length ** displayLength) - 1;

function numberToBitmap(number = 0) {
  if (sanity(number, {
    min: minNumber,
    max: maxNumber
  }) === null) {
    throw new Error('number out of range');
  }

  if (number < 0) {
    return [minus, ...numberToDigits(number, negativeDisplayLength).map((x) => {
      return digitMap[x];
    })];
  }

  return numberToDigits(number, displayLength).map((x) => {
    return digitMap[x];
  });
}

function stringToBitmap(input) {
  if (typeof input !== 'string') {
    throw new Error('input is not a string');
  }

  if (input.length !== displayLength) {
    throw new Error('wrong number of characters');
  }

  return input.split('').map((character) => {
    const x = character.toLowerCase();
    const sign = (x === ' ') ? empty : (
      letterMap[x] || digitMap[Number.parseInt(x, 10)]
    );

    if (sign === undefined) {
      throw new Error(`character "${x}" cannot be displayed`);
    }

    return sign;
  });
}

function segmentGuard(segments = emptyDisplay) {
  if (segments.length !== displayLength) {
    throw new Error('wrong number of segment-maps');
  }

  segments.forEach((segment) => {
    if (segment > ((2 ** 7) - 1)) {
      throw new Error(`segment "${segment.toString(2)}" cannot be displayed`);
    }
  });

  return segments;
}

class SevenSegment extends MessageClient {
  constructor(options) {
    const {
      host = null,
      port = null
    } = options;

    if (!host || !port) {
      throw new Error('insufficient options provided');
    }

    super({
      host,
      port,
      messageTypes: [
        {
          name: 'display',
          generator: (x) => {
            return Buffer.concat(x.map((y) => {
              return Buffer.from([y]);
            }));
          },
          parser: bufferToBoolean
        }
      ]
    });

    this.display = emptyDisplay;

    rebind(this, '_handleConnection');
    this.on('connect', this._handleConnection);
  }

  _handleConnection() {
    this.clear();
  }

  _commit() {
    // console.log(this.display.map((x) => {
    //   return x.toString(2);
    // }));
    return this.request('display', this.display).catch((reason) => {
      log(reason);
    });
  }

  clear() {
    this.display = emptyDisplay;
    return this._commit();
  }

  setNumber(number) {
    this.display = numberToBitmap(number);
    return this._commit();
  }

  setString(string) {
    this.display = stringToBitmap(string);
    return this._commit();
  }

  setSegments(...segments) {
    this.display = segmentGuard(segments);
    return this._commit();
  }

  // Public methods:
  // connect
  // disconnect
  // clear
  // setNumber
  // setString
  // setSegments
  //
  // Public properties:
  // display
}

module.exports = {
  SevenSegment
};
