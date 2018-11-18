const { SingleRelay } = require('../../libs/single-relay');

function createSingleRelayLight(light) {
  const {
    host,
    port
  } = light;

  try {
    return new SingleRelay({
      host,
      port
    });
  } catch (e) {
    return null;
  }
}

(function main() {
  const {
    config: {
      lights
    }
  } = global;

  global.lights = lights.map((light) => {
    const { disable = false, name, type } = light;
    if (disable || !name || !type) return null;

    let instance;

    switch (type) {
      case 'SINGLE_RELAY':
        instance = createSingleRelayLight(light);
        break;
      default:
    }

    if (!instance) return null;

    instance.log.friendlyName(name);
    instance.connect();

    return Object.assign(light, {
      instance
    });
  }).filter(Boolean);
}());
