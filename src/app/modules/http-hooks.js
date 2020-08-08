import { HmiElement } from '../../lib/hmi/index.js';
import { HttpServer } from '../../lib/http/server.js';
import { post } from '../../lib/http/client.js';
import { resolveAlways } from '../../lib/utils/oop.js';

export function create(config, data) {
  const {
    globals: {
      httpHooksPort: port
    }
  } = config;

  const httpHookServer = new HttpServer({
    port,
    handler: HttpServer.do404,
    headers: {
      'Cache-Control': 'no-cache'
    }
  });

  httpHookServer.listen();

  Object.assign(data, {
    httpHookServer
  });
}

export function manage(_, data) {
  const { hmiServer } = data;

  const state = {
    active: false
  };

  const hmi = new HmiElement({
    name: 'ufiClock',
    attributes: {
      category: 'other',
      group: 'ufi',
      section: 'global',
      setType: 'trigger',
      sortCategory: '_bottom',
      type: 'fan'
    },
    server: hmiServer,
    getter: () => {
      return Promise.resolve(state.active ? 'on' : 'off');
    },
    settable: true
  });

  state.toggle = (on) => {
    if (on === undefined) {
      state.active = !state.active;
    } else {
      state.active = on;
    }

    resolveAlways(
      post(`http://ufi.mom.net.wurstsalat.cloud:1338/${state.active ? 'on' : 'off'}`)
    ).then(() => {
      hmi.update();
    });
  };

  hmi.on('set', () => state.toggle());

  data.ufiDisplay = state;
}
