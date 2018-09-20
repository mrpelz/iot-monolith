const { Ev1527Server, Ev1527Device } = require('../../libs/ev1527');

function startEv1527Server(host, port) {
  const ev1527Server = new Ev1527Server({
    host,
    port
  });
  ev1527Server.connect();

  return ev1527Server;
}

function createDevice(device, server) {
  const {
    name,
    type,
    id
  } = device;

  const matchFn = Ev1527Device[type];

  try {
    return new Ev1527Device({
      name,
      id,
      server,
      matchFn
    });
  } catch (e) {
    return null;
  }
}

(function main() {
  const {
    config: {
      'ev1527-devices': ev1527Devices,
      globals: {
        ev1527: {
          host,
          port
        }
      }
    }
  } = global;

  global.ev1527Server = startEv1527Server(host, port);

  global.ev1527Devices = ev1527Devices.map((device) => {
    const { name } = device;
    if (!name) return null;

    const instance = createDevice(device, global.ev1527Server);
    if (!instance) return null;

    return {
      name,
      instance
    };
  }).filter(Boolean);
}());
