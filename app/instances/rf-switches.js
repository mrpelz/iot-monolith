const { Tx118sa4 } = require('../../libs/tx118sa4');

function createWallSwitch(rfSwitch, server) {
  const {
    id
  } = rfSwitch;

  try {
    return new Tx118sa4({
      id,
      server
    });
  } catch (e) {
    return null;
  }
}

(function main() {
  const {
    config: {
      'rf-switches': rfSwitches
    },
    ev1527Server
  } = global;

  global.rfSwitches = rfSwitches.map((rfSwitch) => {
    const { disable = false, name, id } = rfSwitch;
    if (disable || !name || !id) return null;

    const instance = createWallSwitch(rfSwitch, ev1527Server);
    if (!instance) return null;

    instance.log.friendlyName(name);

    return Object.assign(rfSwitch, {
      instance
    });
  }).filter(Boolean);
}());
