import { ApplicationConfig, ApplicationState } from '../app.js';
import { HmiElement } from '../../lib/hmi/index.js';
import { HttpServer } from '../../lib/http/server.js';
import { post } from '../../lib/http/client.js';
import { resolveAlways } from '../../lib/utils/oop.js';

export type State = {
  httpHookServer: HttpServer;
  ufiDisplay: MakeshiftStateObject;
};

type MakeshiftStateObject = {
  active: boolean;
  toggle?: (on?: boolean) => void;
};

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const {
    globals: { httpHooksPort: port },
  } = config;

  const httpHookServer = new HttpServer({
    handler: HttpServer.do404,
    headers: {
      'Cache-Control': 'no-cache',
    },
    port,
  });

  httpHookServer.listen();

  Object.defineProperty(data, 'httpHookServer', {
    value: httpHookServer,
  });
}

export function manage(_: ApplicationConfig, data: ApplicationState): void {
  const { hmiServer } = data;

  const state: MakeshiftStateObject = {
    active: false,
  };

  const hmi = new HmiElement({
    attributes: {
      category: 'other',
      group: 'ufi',
      section: 'global',
      setType: 'trigger',
      sortCategory: '_bottom',
      type: 'fan',
    },
    getter: () => {
      return Promise.resolve(state.active ? 'on' : 'off');
    },
    name: 'ufiClock',
    server: hmiServer,
    settable: true,
  });

  state.toggle = (on) => {
    if (on === undefined) {
      state.active = !state.active;
    } else {
      state.active = on;
    }

    resolveAlways(
      post(
        `http://ufi.mom.net.wurstsalat.cloud:1338/${
          state.active ? 'on' : 'off'
        }`
      )
    ).then(() => {
      hmi.update();
    });
  };

  hmi.on('set', () => state.toggle && state.toggle());

  Object.defineProperty(data, 'ufiDisplay', {
    value: state,
  });
}
