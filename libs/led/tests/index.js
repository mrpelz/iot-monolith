/* eslint-disable no-console */
const { LedDriver, LedLight } = require('../index');
const { resolveAlways } = require('../../utils/oop');
// const { sleep } = require('../../utils/time');

const led = new LedLight({
  driver: new LedDriver({
    host: '10.97.4.51',
    port: 5045,
    channels: 5
  }),
  useChannel: 0
});

led.driver.once('connect', async () => {
  console.log('connected');
  resolveAlways(led.driver.indicatorBlink(5));

  resolveAlways(led.setBrightness(0.5, 10000));
});

led.driver.connect();
