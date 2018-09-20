const { HmiElement } = require('../../libs/hmi');

function manageObiJackLight(light, hmiServer) {
  const { name, instance, type } = light;

  const hmi = new HmiElement({
    name,
    attributes: {
      type
    },
    server: hmiServer,
    handlers: {
      get: () => {
        return Promise.resolve(instance.relayState);
      },
      set: (input) => {
        return instance.relay(Boolean(input));
      }
    }
  });

  instance.on('connect', () => {
    instance.ledBlink(5);
  });

  instance.on('buttonShortpress', async () => {
    await instance.relay(!instance.relayState);
    instance.ledBlink(instance.relayState ? 2 : 1);
    hmi.update();
  });
}

(function main() {
  const { hmiServer, lights } = global;

  lights.forEach((light) => {
    const { type } = light;

    switch (type) {
      case 'OBI_JACK':
        manageObiJackLight(light, hmiServer);
        break;
      default:
    }
  });
}());
