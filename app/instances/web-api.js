const { WebApi } = require('../../libs/web-api');

const {
  config: {
    globals: {
      webApiPort,
      webApiUpdateSeconds: update
    },
    hmi: {
      webApi: meta
    }
  },
  hmiServer,
  scheduler
} = global;

const webApi = new WebApi({
  port: webApiPort,
  hmiServer,
  scheduler,
  update,
  meta
});
webApi.start();

global.webApi = webApi;
