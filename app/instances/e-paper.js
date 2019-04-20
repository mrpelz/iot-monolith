const { EPaper } = require('../../libs/e-paper');

const {
  config: {
    globals: {
      ePaper: {
        enabled = false,
        update,
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
    url,
    hmiServer,
    scheduler,
    update
  });

  ePaper.start();

  return ePaper;
}

global.ePaper = createEPaper();
