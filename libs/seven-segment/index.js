const { MessageClient } = require('../messaging');
const {
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
  a: 0b11101110,
  b: 0b00111110,
  c: 0b10011100,
  d: 0b01111010,
  e: 0b10011110,
  f: 0b10001110,
  g: 0b11110110,
  h: 0b01101110,
  i: 0b01100000,
  j: 0b01111000,
  l: 0b00011100,
  n: 0b00101010,
  o: 0b00111010,
  p: 0b11001110,
  q: 0b11100110,
  r: 0b00001010,
  s: 0b10110110,
  u: 0b00111000,
  y: 0b01110110,
  z: 0b11011010,
  _: 0b00010000,
  '-': 0b00000010
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
    return [
      letterMap['-'],
      ...numberToDigits(number, negativeDisplayLength).map((x) => {
        if (x === 0) {
          return empty;
        }

        return digitMap[x];
      })
    ];
  }

  return numberToDigits(number, displayLength).map((x) => {
    if (x === 0) {
      return empty;
    }

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
      display: emptyDisplay
    };

    rebind(this, '_handleConnection');
    this.on('connect', this._handleConnection);

    this._sevenSegment.log = new Logger(libName, `${host}:${port}`);
  }

  _handleConnection() {
    this.clear();
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
    this._sevenSegment.display = numberToBitmap(number);
    return this._commit();
  }

  setString(string) {
    this._sevenSegment.display = stringToBitmap(string);
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
