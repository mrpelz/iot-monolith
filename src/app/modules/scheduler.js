const { Scheduler } = require('../../lib/utils/time');

function create(config, data) {
  const {
    globals: {
      schedulerPrecision
    }
  } = config;

  Object.assign(data, {
    scheduler: new Scheduler(schedulerPrecision)
  });
}

module.exports = {
  create
};
