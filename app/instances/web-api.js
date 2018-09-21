const { WebApi } = require('../../libs/web-api');

const {
  config: {
    globals: {
      webApiPort,
      webApiUpdateSeconds: update
    }
  },
  hmiServer,
  scheduler
} = global;

const webApi = new WebApi({
  port: webApiPort,
  hmiServer,
  scheduler,
  update
});
webApi.start();

global.webApi = webApi;
