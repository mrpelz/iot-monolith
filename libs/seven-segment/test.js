/* eslint-disable no-console */
const { SevenSegment } = require('./index');
const { sleep } = require('../utils/time');

const display = new SevenSegment({
  host: '10.97.4.2',
  port: 3000
});

// (async function test() {
display.on('connect', async () => {
  console.log('connected');

  try {
    await sleep(2000);
    await display.setNumber(-1);
    await sleep(500);
    await display.setNumber(1);
    await sleep(500);
    await display.setNumber(10);
    await sleep(500);
    await display.setNumber(100);
    await sleep(500);
    await display.setNumber(1000);
    await sleep(500);
    await display.setNumber(9999);
    await sleep(500);
    await display.setNumber(-999);
    await sleep(500);
    await display.setNumber(1);
    await sleep(500);
    await display.setNumber(21);
    await sleep(500);
    await display.setNumber(321);
    await sleep(500);
    await display.setNumber(4321);
    await sleep(500);
    await display.setNumber(5432);
    await sleep(500);
    await display.setNumber(6543);
    await sleep(500);
    await display.setNumber(7654);
    await sleep(500);
    await display.setNumber(8765);
    await sleep(500);
    await display.setNumber(9876);
    await sleep(500);
    await display.setNumber(8760);
    await sleep(500);
    await display.setNumber(7600);
    await sleep(500);
    await display.setNumber(6000);
    await sleep(500);
    await display.setNumber(0);
    await sleep(500);
    await display.setString('abc ');
    await sleep(500);
    await display.setString(' def');
    await sleep(500);
    await display.setString('dead');
    await sleep(500);
    await display.setString('beef');
    await sleep(500);
    await display.setString('ff00');
    await sleep(500);
    await display.setString('00ff');
    await sleep(500);
    await display.setSegments(
      0b1000000,
      0b1000000,
      0b1000000,
      0b1000000,
    );
    await sleep(500);
    await display.setSegments(
      0b100000,
      0b1100000,
      0b1100000,
      0b100000,
    );
    await sleep(500);
    await display.setSegments(
      0b10000,
      0b1110000,
      0b1110000,
      0b10000,
    );
    await sleep(500);
    await display.setSegments(
      0b1000,
      0b1111000,
      0b1111000,
      0b1000,
    );
    await sleep(500);
    await display.setSegments(
      0b100,
      0b1111100,
      0b1111100,
      0b100,
    );
    await sleep(500);
    await display.setSegments(
      0b10,
      0b1111110,
      0b1111110,
      0b10,
    );
    await sleep(500);
    await display.setSegments(
      1,
      1,
      1,
      1,
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
