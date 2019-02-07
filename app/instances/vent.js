const { Vent } = require('../../libs/vent');

function createVent(vent) {
  const {
    host,
    port,
    setDefaultTimeout
  } = vent;

  try {
    return new Vent({
      host,
      port,
      setDefaultTimeout
    });
  } catch (e) {
    return null;
  }
}

(function main() {
  const {
    config: {
      vent
    }
  } = global;

  const { disable = false, name } = vent;

  if (disable || !name) return;

  const instance = createVent(vent);

  if (!instance) return;

  instance.log.friendlyName(name);
  instance.connect();

  global.vent = Object.assign(vent, {
    instance
  });
}());
