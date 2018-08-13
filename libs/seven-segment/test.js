/* eslint-disable no-console */
const { SevenSegment } = require('./index');
const { sleep } = require('../utils/time');

const display = new SevenSegment({
  host: '127.0.0.1',
  port: 3000
});

// (async function test() {
display.once('connect', async () => {
  console.log('connected');

  try {
    await sleep(2000);
    await display.setNumber(0);
    await sleep(2000);
    await display.setNumber(-1);
    await sleep(2000);
    await display.setNumber(1);
    await sleep(2000);
    await display.setNumber(10);
    await sleep(2000);
    await display.setNumber(100);
    await sleep(2000);
    await display.setNumber(1000);
    await sleep(2000);
    await display.setNumber(9999);
    await sleep(2000);
    await display.setNumber(-999);
    await sleep(2000);
    await display.clear();
    await sleep(2000);
    await display.setNumber(123);
    await sleep(2000);
    await display.setNumber(456);
    await sleep(2000);
    await display.setNumber(789);
    await sleep(2000);
    await display.clear();
    await sleep(2000);
    await display.setString('abc ');
    await sleep(2000);
    await display.setString(' def');
    await sleep(2000);
    await display.setString('dead');
    await sleep(2000);
    await display.setString('beef');
    await sleep(2000);
    await display.setString('ff00');
    await sleep(2000);
    await display.setString('0b01');
    await sleep(2000);
    await display.clear();
    await sleep(2000);
    await display.setString('abcd');
    await sleep(2000);
    await display.setString('efgh');
    await sleep(2000);
    await display.setString('ijln');
    await sleep(2000);
    await display.setString('opqr');
    await sleep(2000);
    await display.setString('suyz');
    await sleep(2000);
    await display.setString('-__-');
    await sleep(2000);
    await display.clear();
    await sleep(2000);
    await display.setSegments(
      0b10000000,
      0b10000000,
      0b10000000,
      0b10000000,
    );
    await sleep(2000);
    await display.setSegments(
      0b01000000,
      0b11000000,
      0b11000000,
      0b01000000,
    );
    await sleep(2000);
    await display.setSegments(
      0b00100000,
      0b11100000,
      0b11100000,
      0b00100000,
    );
    await sleep(2000);
    await display.setSegments(
      0b00010000,
      0b11110000,
      0b11110000,
      0b00010000,
    );
    await sleep(2000);
    await display.setSegments(
      0b00001000,
      0b11111000,
      0b11111000,
      0b00001000,
    );
    await sleep(2000);
    await display.setSegments(
      0b00000100,
      0b11111100,
      0b11111100,
      0b00000100,
    );
    await sleep(2000);
    await display.setSegments(
      0b00000010,
      0b11111110,
      0b11111110,
      0b00000010,
    );
    await sleep(2000);
    await display.clear();
  } catch (error) {
    console.error('error', error);
  }

  display.disconnect();
});

display.connect();
// }());
