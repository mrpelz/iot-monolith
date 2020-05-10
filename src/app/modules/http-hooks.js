const { HmiElement } = require('../../lib/hmi');
const { HttpServer } = require('../../lib/http/server');
const { post } = require('../../lib/http/client');
const { resolveAlways } = require('../../lib/utils/oop');

function create(config, data) {
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

function manage(_, data) {
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

module.exports = {
  create,
  manage
};
