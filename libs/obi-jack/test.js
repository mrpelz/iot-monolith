/* eslint-disable no-console */
const { ObiJack } = require('./index');

// OBI-JACK TEST
const jack = new ObiJack({
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
    jack.relay(!jack.relayState);
    jack.ledBlink(jack.relayState ? 2 : 1);
  });

  jack.on('buttonLongpress', () => {
    console.log('button was long-pressed');
  });

  jack.on('disconnect', () => {
    console.log('disconnected');
  });
});

jack.start();
