import { ApplicationConfig, ApplicationState } from '../app.js';
import { WebApi } from '../../lib/web-api/index.js';

export type State = {
  webApi: WebApi;
};

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const {
    globals: { webApiPort, webApiUpdate: update },
    hmi: { webApi: meta },
  } = config;

  const { hmiServer, scheduler } = data;

  const webApi = new WebApi({
    hmiServer,
    meta,
    port: webApiPort,
    scheduler,
    update,
  });

  webApi.start();

  Object.defineProperty(data, 'webApi', {
    value: webApi,
  });
}
