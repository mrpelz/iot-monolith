const { MessageClient } = require('../messaging');
const {
  arrayPadLeft,
  concatBytes,
  bufferToBoolean,
  numberToDigits,
  sanity,
  swapByte
} = require('../utils/data');
const { rebind } = require('../utils/oop');
const { Logger } = require('../log');

const libName = 'seven-segment';

const displayLength = 4;
const signLength = 1;
const negativeDisplayLength = displayLength - signLength;

const empty = 0b00000000;

const digitMap = [
  0b11111100,
  0b01100000,
  0b11011010,
  0b11110010,
  0b01100110,
  0b10110110,
  0b10111110,
  0b11100000,
  0b11111110,
  0b11110110
];

const letterMap = {
  A: 0b11101110,
  b: 0b00111110,
  C: 0b10011100,
  c: 0b00011010,
  d: 0b01111010,
  E: 0b10011110,
  F: 0b10001110,
  g: 0b11110110,
  H: 0b01101110,
  h: 0b00101110,
  I: 0b01100000,
  i: 0b00100000,
  J: 0b11111000,
  j: 0b01111000,
  l: 0b00011100,
  n: 0b00101010,
  O: 0b11111100,
  o: 0b00111010,
  P: 0b11001110,
  q: 0b11100110,
  r: 0b00001010,
  S: 0b10110110,
  t: 0b00011110,
  U: 0b01111100,
  u: 0b00111000,
  Y: 0b01110110,
  Z: 0b11011010,
  _: 0b00010000,
  '-': 0b00000010
};

const emptyDisplay = Array(displayLength).fill(empty);

/* eslint-disable-next-line no-bitwise */
const minNumber = ~((digitMap.length ** negativeDisplayLength) - 1) + 1;
const maxNumber = (digitMap.length ** displayLength) - 1;

function digitsToBytemap(digits, length) {
  return arrayPadLeft(digits, length).map((digit) => {
    if (digit === null) {
      return empty;
    }

    return digitMap[digit];
  });
}

function numberToBytemap(number = 0) {
  if (sanity(number, {
    min: minNumber,
    max: maxNumber
  }) === null) {
    throw new Error('number out of range');
  }

  if (number < 0) {
    return [
      letterMap['-'],
      ...digitsToBytemap(numberToDigits(number), negativeDisplayLength)
    ];
  }

  return digitsToBytemap(numberToDigits(number), displayLength);
}

function stringToBytemap(input) {
  if (typeof input !== 'string') {
    throw new Error('input is not a string');
  }

  if (input.length !== displayLength) {
    throw new Error('wrong number of characters');
  }

  return input.split('').map((char) => {
    const lc = char.toLowerCase();
    const uc = char.toUpperCase();
    const sign = (lc === ' ') ? empty : (
      letterMap[char]
      || letterMap[lc]
      || letterMap[uc]
      || digitMap[Number.parseInt(char, 10)]
    );

    if (sign === undefined) {
      throw new Error(`character "${lc}" cannot be displayed`);
    }

    return sign;
  });
}

function segmentGuard(segments = emptyDisplay) {
  if (segments.length !== displayLength) {
    throw new Error('wrong number of segment-maps');
  }

  segments.forEach((segment) => {
    if (segment > ((2 ** 8) - 0b10)) {
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
          generator: (input) => {
            return concatBytes(input.map((byte) => {
              return swapByte(byte);
            }));
          },
          parser: bufferToBoolean
        }
      ]
    });

    this._sevenSegment = {
      display: emptyDisplay,
      onConnectTimeout: null
    };

    rebind(this, '_handleSevenSegmentConnection', '_handleSevenSegmentDisconnection');
    this.on('connect', this._handleSevenSegmentConnection);
    this.on('disconnect', this._handleSevenSegmentDisconnection);

    this._sevenSegment.log = new Logger(libName, `${host}:${port}`);
  }

  _handleSevenSegmentConnection() {
    const { onConnectTimeout } = this._sevenSegment;

    if (onConnectTimeout) {
      clearTimeout(onConnectTimeout);
    }

    this._sevenSegment.onConnectTimeout = setTimeout(() => {
      this._sevenSegment.onConnectTimeout = null;

      this.clear();
    }, 500);
  }

  _handleSevenSegmentDisconnection() {
    const { onConnectTimeout } = this._sevenSegment;

    if (onConnectTimeout) {
      clearTimeout(onConnectTimeout);
      this._sevenSegment.onConnectTimeout = null;
    }
  }

  _commit() {
    const { display, log } = this._sevenSegment;
    // console.log(display.map((x) => {
    //   return x.toString(2);
    // }));
    return this.request('display', display).catch((reason) => {
      log.notice({
        head: 'display error',
        attachment: reason
      });
    });
  }

  clear() {
    this._sevenSegment.display = emptyDisplay;
    return this._commit();
  }

  setNumber(number) {
    this._sevenSegment.display = numberToBytemap(number);
    return this._commit();
  }

  setString(string) {
    this._sevenSegment.display = stringToBytemap(string);
    return this._commit();
  }

  setSegments(...segments) {
    this._sevenSegment.display = segmentGuard(segments);
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
