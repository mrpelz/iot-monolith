/* eslint-disable no-console */
import { LedDriver, RGBLed } from '../index.js';

import { resolveAlways } from '../../utils/oop.js';
import { sleep } from '../../utils/time.js';

const rgb = new RGBLed({
  driver: new LedDriver({
    channels: 5,
    host: '10.97.4.51',
    port: 5045,
  }),
  /* eslint-disable sort-keys */
  r: 0,
  g: 1,
  b: 2,
  /* eslint-enable sort-keys */
});

rgb.driver.once('connect', async () => {
  console.log('connected');
  resolveAlways(rgb.driver.indicatorBlink(5));

  await sleep(5000);
  resolveAlways(rgb.setColor(1, 1, 1, 30000));
  await sleep(30000 + 5000);
  resolveAlways(rgb.setColor(0, 0, 0, 1500));
  await sleep(1500 + 5000);
  resolveAlways(rgb.setColor(1, 1, 1, 10000));
  await sleep(10000 + 5000);
  resolveAlways(rgb.setColor(0, 0, 0, 1500));
  await sleep(1500 + 5000);
  resolveAlways(rgb.setColor(1, 0, 0, 1500));
  await sleep(1500 + 5000);
  resolveAlways(rgb.setColor(0, 1, 0, 1500));
  await sleep(1500 + 5000);
  resolveAlways(rgb.setColor(0, 0, 1, 1500));
  await sleep(1500 + 5000);
  resolveAlways(rgb.setColor(0, 0, 0, 1500));
  await sleep(1500 + 5000);
  resolveAlways(rgb.setColor(0.5, 0.5, 0.5, 1500));
  await sleep(1500 + 5000);
  resolveAlways(rgb.setColor(0.5, 0, 0.5, 1500));
  await sleep(1500 + 5000);
  resolveAlways(rgb.setColor(0.5, 0.5, 0, 1500));
  await sleep(1500 + 5000);
  resolveAlways(rgb.setColor(0, 0.5, 0.5, 1500));
  await sleep(1500 + 5000);
  resolveAlways(rgb.setColor(1, 1, 1, 1500));
  await sleep(1500 + 5000);
  resolveAlways(rgb.setColor(0, 0, 0, 0));
});

rgb.driver.connect();
