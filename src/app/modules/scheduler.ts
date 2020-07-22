import { ApplicationConfig, ApplicationState } from '../app.js';
import { Scheduler } from '../../lib/utils/time.js';

export type State = {
  scheduler: Scheduler;
};

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const {
    globals: { schedulerPrecision },
  } = config;

  Object.defineProperty(data, 'scheduler', {
    value: new Scheduler(schedulerPrecision),
  });
}
