const { Hmi } = require('../../libs/hmi');

const { scheduler } = global;

const hmi = new Hmi({
  scheduler
});
hmi.start();

global.hmi = hmi;
