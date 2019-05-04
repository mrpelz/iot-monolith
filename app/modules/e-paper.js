const { EPaper } = require('../../libs/e-paper');

function create(config, data) {
  const {
    globals: {
      ePaper: {
        enabled = false,
        meta,
        update,
        updateOffset,
        url
      }
    }
  } = config;

  const {
    hmiServer,
    scheduler
  } = data;

  if (!enabled) return;

  const ePaper = new EPaper({
    hmiServer,
    meta,
    scheduler,
    update,
    updateOffset,
    url
  });

  ePaper.start();

  Object.assign(data, {
    ePaper
  });
}

module.exports = {
  create
};
