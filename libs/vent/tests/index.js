/* eslint-disable no-console */
const { Vent } = require('../index');
const { resolveAlways } = require('../../../libs/utils/oop');

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

  console.log('set target', await resolveAlways(instance.setTarget(5)));
});

instance.on('switch', (value) => {
  console.log('switch', value);
});

instance.connect();
