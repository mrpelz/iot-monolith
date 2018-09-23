const { Tx118sa4 } = require('../../libs/tx118sa4');

function createWallSwitch(wallSwitch, server) {
  const {
    id
  } = wallSwitch;

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
      'wall-switches': wallSwitches
    },
    ev1527Server
  } = global;

  global.wallSwitches = wallSwitches.map((wallSwitch) => {
    const { name, id } = wallSwitch;
    if (!name || !id) return null;

    const instance = createWallSwitch(wallSwitch, ev1527Server);
    if (!instance) return null;

    instance.log.friendlyName(name);

    return Object.assign(wallSwitch, {
      instance
    });
  }).filter(Boolean);
}());
