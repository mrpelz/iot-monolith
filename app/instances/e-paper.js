const { EPaper } = require('../../libs/e-paper');

const {
  config: {
    globals: {
      ePaper: {
        enabled = false,
        meta,
        update,
        updateOffset,
        url
      }
    }
  },
  hmiServer,
  scheduler
} = global;

function createEPaper() {
  if (!enabled) return null;

  const ePaper = new EPaper({
    hmiServer,
    meta,
    scheduler,
    update,
    updateOffset,
    url
  });

  ePaper.start();

  return ePaper;
}

global.ePaper = createEPaper();
