const { HttpServer } = require('../../libs/http/server');

const {
  config: {
    globals: {
      httpHooksPort: port
    }
  }
} = global;

const httpHookServer = new HttpServer({
  port,
  handler: HttpServer.do404,
  headers: {
    'Cache-Control': 'no-cache'
  }
});

httpHookServer.listen();

global.httpHookServer = httpHookServer;
