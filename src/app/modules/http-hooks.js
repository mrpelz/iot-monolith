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

  let active = false;

  const hmi = new HmiElement({
    name: 'ufiClock',
    attributes: {
      category: 'other',
      group: 'clock',
      section: 'global',
      setType: 'trigger',
      sortCategory: '_bottom',
      type: 'binary-light'
    },
    server: hmiServer,
    getter: () => {
      return Promise.resolve(active ? 'on' : 'off');
    },
    settable: true
  });

  hmi.on('set', () => {
    active = !active;

    resolveAlways(
      post(`http://ufi.mom.net.wurstsalat.cloud:1338/${active ? 'on' : 'off'}`)
    ).then(() => {
      hmi.update();
    });
  });
}
