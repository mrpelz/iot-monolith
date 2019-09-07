const { EPaper } = require('../../lib/e-paper');

function create(config, data) {
  const {
    globals: {
      ePaper: {
        disabled = false,
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

  if (disabled) return;

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
