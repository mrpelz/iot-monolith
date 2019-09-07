const { Db } = require('../../lib/db');

function create(config, data) {
  const {
    globals: {
      dbWriteInterval: saveInterval
    }
  } = config;

  const {
    scheduler
  } = data;

  Object.assign(data, {
    db: new Db({
      saveInterval,
      scheduler
    })
  });
}

module.exports = {
  create
};
