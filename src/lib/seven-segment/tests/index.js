/* eslint-disable no-console */
import { SevenSegment } from '../index.js';

import { sleep } from '../../utils/time.js';

const display = new SevenSegment({
  host: '10.97.0.227',
  port: 5045
});

// (async function test() {
display.once('connect', async () => {
  console.log('connected');

  try {
    await sleep(3000);
    await display.setNumber(-1);
    await sleep(1000);
    await display.setNumber(0);
    await sleep(1000);
    await display.setNumber(1);
    await sleep(1000);
    await display.setNumber(10);
    await sleep(1000);
    await display.setNumber(100);
    await sleep(1000);
    await display.setNumber(1000);
    await sleep(1000);
    await display.setNumber(9999);
    await sleep(1000);
    await display.setNumber(-999);
    await sleep(1000);
    await display.clear();
    await sleep(1000);
    await display.setNumber(123);
    await sleep(1000);
    await display.setNumber(456);
    await sleep(1000);
    await display.setNumber(789);
    await sleep(1000);
    await display.clear();
    await sleep(1000);
    await display.setString('dead');
    await sleep(1000);
    await display.setString('beef');
    await sleep(1000);
    await display.clear();
    await sleep(1000);
    await display.setString('----');
    await sleep(1000);
    await display.setString('____');
    await sleep(1000);
    await display.clear();
    await sleep(1000);
    await display.setString('abc ');
    await sleep(1000);
    await display.setString('def ');
    await sleep(1000);
    await display.setString('ghi ');
    await sleep(1000);
    await display.setString('jln ');
    await sleep(1000);
    await display.setString('opq ');
    await sleep(1000);
    await display.setString('rst ');
    await sleep(1000);
    await display.setString('uyz ');
    await sleep(1000);
    await display.clear();
    await sleep(1000);
    await display.setString('ABC ');
    await sleep(1000);
    await display.setString('DEF ');
    await sleep(1000);
    await display.setString('GHI ');
    await sleep(1000);
    await display.setString('JLN ');
    await sleep(1000);
    await display.setString('OPQ ');
    await sleep(1000);
    await display.setString('RST ');
    await sleep(1000);
    await display.setString('UYZ ');
    await sleep(1000);
    await display.clear();
    await sleep(1000);
    await display.setSegments(
      0b10000000,
      0b10000000,
      0b10000000,
      0b10000000,
    );
    await sleep(1000);
    await display.setSegments(
      0b01000000,
      0b11000000,
      0b11000000,
      0b01000000,
    );
    await sleep(1000);
    await display.setSegments(
      0b00100000,
      0b11100000,
      0b11100000,
      0b00100000,
    );
    await sleep(1000);
    await display.setSegments(
      0b00010000,
      0b11110000,
      0b11110000,
      0b00010000,
    );
    await sleep(1000);
    await display.setSegments(
      0b00001000,
      0b11111000,
      0b11111000,
      0b00001000,
    );
    await sleep(1000);
    await display.setSegments(
      0b00000100,
      0b11111100,
      0b11111100,
      0b00000100,
    );
    await sleep(1000);
    await display.setSegments(
      0b00000010,
      0b11111110,
      0b11111110,
      0b00000010,
    );
    await sleep(1000);
    await display.setSlideshow('DIES IST EIN TOLLER TEST');
    await sleep(1000);
    await display.setCrawl('SCROLL SCROLL SCROLL');
    await display.clear();
    await sleep(3000);
  } catch (error) {
    console.error('error', error);
  }

  display.disconnect();
});

display.connect();
// }());
