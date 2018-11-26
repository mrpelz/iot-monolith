/* eslint-disable no-console */
const { SingleRelay } = require('../index');

// SINGLE-RELAY TEST
const jack = new SingleRelay({
  host: '127.0.0.1',
  port: 3001
});

jack.on('connect', () => {
  console.log('connected');
  jack.ledBlink(5);

  jack.on('buttonDown', () => {
    console.log('button is down');
  });

  jack.on('buttonUp', () => {
    console.log('button is up');
  });

  jack.on('buttonShortpress', () => {
    console.log('button was short-pressed');
    jack.setPower(!jack.power);
    jack.ledBlink(jack.power ? 2 : 1);
  });

  jack.on('buttonLongpress', () => {
    console.log('button was long-pressed');
  });

  jack.on('disconnect', () => {
    console.log('disconnected');
  });
});

jack.connect();
