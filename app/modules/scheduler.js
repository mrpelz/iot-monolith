const { Scheduler } = require('../../libs/utils/time');

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
