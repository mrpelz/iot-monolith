/* eslint-disable no-console */
const { Vent } = require('../index');
const { resolveAlways } = require('../../../libs/utils/oop');
const { sleep } = require('../../../libs/utils/time');

// SINGLE-RELAY TEST
const instance = new Vent({
  host: '10.97.0.225',
  port: 5045,
  setDefaultTimeout: 7200000 // two hours
});

instance.on('connect', async () => {
  console.log('connected');

  console.log('actualIn', await resolveAlways(instance.getActualIn()));
  console.log('actualOut', await resolveAlways(instance.getActualOut()));

  await sleep(5000);
  console.log('set target', await resolveAlways(instance.setTarget(0)));
  await sleep(5000);
  console.log('set target', await resolveAlways(instance.setTarget(1)));
  await sleep(5000);
  console.log('set target', await resolveAlways(instance.setTarget(2)));
  await sleep(5000);
  console.log('set target', await resolveAlways(instance.setTarget(3)));
  await sleep(5000);
  console.log('set target', await resolveAlways(instance.setTarget(4)));
  await sleep(5000);
  console.log('set target', await resolveAlways(instance.setTarget(5)));
  await sleep(5000);
  console.log('set target', await resolveAlways(instance.setTarget(6)));
  await sleep(5000);
  console.log('set target', await resolveAlways(instance.setTarget(7)));
  await sleep(5000);
  console.log('set target', await resolveAlways(instance.setTarget(0)));
});

instance.on('switch', (value) => {
  console.log('switch', value);
});

instance.connect();
