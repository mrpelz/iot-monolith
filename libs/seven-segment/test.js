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
    await display.clear();
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
    await display.clear();
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
    await display.clear();
    await sleep(500);
    await display.setString('   a');
    await sleep(500);
    await display.setString('  ab');
    await sleep(500);
    await display.setString(' abc');
    await sleep(500);
    await display.setString('abcd');
    await sleep(500);
    await display.setString('bcde');
    await sleep(500);
    await display.setString('cdef');
    await sleep(500);
    await display.setString('defg');
    await sleep(500);
    await display.setString('efgh');
    await sleep(500);
    await display.setString('fghi');
    await sleep(500);
    await display.setString('ghij');
    await sleep(500);
    await display.setString('hijl');
    await sleep(500);
    await display.setString('ijln');
    await sleep(500);
    await display.setString('jlno');
    await sleep(500);
    await display.setString('lnop');
    await sleep(500);
    await display.setString('nopr');
    await sleep(500);
    await display.setString('oprs');
    await sleep(500);
    await display.setString('prsu');
    await sleep(500);
    await display.setString('rsuy');
    await sleep(500);
    await display.setString('suyz');
    await sleep(500);
    await display.setString('uyz_');
    await sleep(500);
    await display.setString('yz_-');
    await sleep(500);
    await display.setString('z_- ');
    await sleep(500);
    await display.setString('_-  ');
    await sleep(500);
    await display.setString('-   ');
    await sleep(500);
    await display.clear();
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
