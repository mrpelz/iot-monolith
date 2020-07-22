import { ApplicationConfig, ApplicationState } from '../app.js';
import { HmiServer } from '../../lib/hmi/index.js';

export type HmiConfig = ApplicationConfig['hmi'];

export type State = {
  hmiServer: HmiServer;
};

export function create(_: ApplicationConfig, data: ApplicationState): void {
  Object.defineProperty(data, 'hmiServer', {
    value: new HmiServer(),
  });
}
