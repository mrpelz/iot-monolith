const { WebApi } = require('../../libs/web-api');

const {
  config: {
    globals: {
      webApiPort
    }
  },
  hmiServer,
  scheduler
} = global;

const webApi = new WebApi({
  port: webApiPort,
  hmiServer,
  scheduler
});
webApi.start();

global.webApi = webApi;
