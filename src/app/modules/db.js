import { Db } from '../../lib/db/index.js';

export function create(config, data) {
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
