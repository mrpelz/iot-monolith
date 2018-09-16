const { Scheduler } = require('../../libs/utils/time');

const {
  config: {
    globals: {
      schedulerPrecision
    }
  }
} = global;

global.scheduler = new Scheduler(schedulerPrecision);
