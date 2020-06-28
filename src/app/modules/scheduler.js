import { Scheduler } from '../../lib/utils/time.js';

export function create(config, data) {
  const {
    globals: {
      schedulerPrecision
    }
  } = config;

  Object.assign(data, {
    scheduler: new Scheduler(schedulerPrecision)
  });
}
