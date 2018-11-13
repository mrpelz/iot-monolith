const { Db } = require('../../libs/db');

const {
  config: {
    globals: {
      dbWriteIntervalSeconds: saveInterval
    }
  },
  scheduler
} = global;

const db = new Db({
  saveInterval,
  scheduler
});

global.db = db;
