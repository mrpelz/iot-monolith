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
    const { name, type } = light;
    if (!name || !type) return null;

    let instance;

    switch (type) {
      case 'OBI_JACK':
        instance = createObiJackLight(light);
        break;
      default:
    }

    if (!instance) return null;

    instance.connect();

    return Object.assign(light, {
      instance
    });
  }).filter(Boolean);
}());
