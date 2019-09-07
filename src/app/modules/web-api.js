const { WebApi } = require('../../lib/web-api');

function create(config, data) {
  const {
    globals: {
      webApiPort,
      webApiUpdate: update
    },
    hmi: {
      webApi: meta
    }
  } = config;

  const {
    hmiServer,
    scheduler
  } = data;

  const webApi = new WebApi({
    port: webApiPort,
    hmiServer,
    scheduler,
    update,
    meta
  });

  webApi.start();

  Object.assign(data, {
    webApi
  });
}

module.exports = {
  create
};
