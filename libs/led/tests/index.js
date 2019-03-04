/* eslint-disable no-console */
const { LedDriver, RGBLed } = require('../index');
const { resolveAlways } = require('../../utils/oop');
const { sleep } = require('../../utils/time');

const rgb = new RGBLed({
  driver: new LedDriver({
    host: '10.97.4.51',
    port: 5045,
    channels: 5
  }),
  r: 0,
  g: 1,
  b: 2
});

rgb.driver.once('connect', async () => {
  console.log('connected');
  resolveAlways(rgb.driver.indicatorBlink(5));

  resolveAlways(rgb.setColor(1, 1, 1, 3000));

  await sleep(5000);
  resolveAlways(rgb.setColor(1, 0, 0, 3000));
  await sleep(5000);
  resolveAlways(rgb.setColor(0, 1, 0, 3000));
  await sleep(5000);
  resolveAlways(rgb.setColor(0, 0, 1, 3000));
  await sleep(5000);
  resolveAlways(rgb.setColor(1, 1, 1, 3000));
  await sleep(5000);
  resolveAlways(rgb.setColor(1, 0, 1, 3000));
  await sleep(5000);
  resolveAlways(rgb.setColor(1, 1, 0, 3000));
  await sleep(5000);
  resolveAlways(rgb.setColor(0, 1, 1, 3000));
  await sleep(5000);
  resolveAlways(rgb.setColor(1, 1, 1, 3000));
});

rgb.driver.connect();
