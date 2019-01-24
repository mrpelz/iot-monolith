/* eslint-disable no-console */
const { SingleRelay } = require('../index');
const { resolveAlways } = require('../../../libs/utils/oop');

// SINGLE-RELAY TEST
const instance = new SingleRelay({
  host: '10.97.4.45',
  port: 5045
});

instance.on('connect', () => {
  resolveAlways(instance.ledBlink(5, true));
});

instance.on('buttonShortpress', () => {
  instance.toggle();
});

instance.on('change', () => {
  resolveAlways(instance.ledBlink(instance.power ? 2 : 1, true));
});

instance.connect();
