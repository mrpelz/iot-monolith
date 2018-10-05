const { ObiJack } = require('../../libs/obi-jack');

function createObiJackLight(light) {
  const {
    host,
    port
  } = light;

  try {
    return new ObiJack({
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
      case 'OBI_JACK':
        instance = createObiJackLight(light);
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
