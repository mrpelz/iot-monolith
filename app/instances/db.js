const { Db } = require('../../libs/db');

const {
  config: {
    globals: {
      dbWriteInterval: saveInterval
    }
  },
  scheduler
} = global;

const db = new Db({
  saveInterval,
  scheduler
});

global.db = db;
