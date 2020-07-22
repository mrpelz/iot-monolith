import { ApplicationConfig, ApplicationState } from '../app.js';
import { Db } from '../../lib/db/index.js';

export type State = {
  db: Db;
};

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const {
    globals: { dbWriteInterval: saveInterval },
  } = config;

  const { scheduler } = data;

  Object.defineProperty(data, 'db', {
    value: new Db(saveInterval, scheduler),
  });
}
