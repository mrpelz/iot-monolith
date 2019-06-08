const { HttpServer } = require('../../lib/http/server');

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

module.exports = {
  create
};
