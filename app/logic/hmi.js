const { HmiElement } = require('../../libs/hmi');
const { camel } = require('../../libs/utils/string');

function doorSensorsHmi(doorSensors, hmiServer) {
  doorSensors.forEach((doorSensor) => {
    const { name, instance } = doorSensor;

    const hmi = new HmiElement({
      name,
      attributes: {
        location: name,
        type: 'door'
      },
      server: hmiServer,
      handlers: {
        get: () => {
          return Promise.resolve(instance.isOpen);
        }
      }
    });

    instance.on('change', () => {
      hmi.update();
    });
  });
}

function roomSensorsHmi(roomSensors, hmiServer, valueSanity) {
  roomSensors.forEach((sensor) => {
    const { name, instance, metrics } = sensor;

    return metrics.forEach((metric) => {
      const hmiName = camel(name, metric);
      const get = instance.access('get', metric);

      /* eslint-disable-next-line no-new */
      new HmiElement({
        name: hmiName,
        attributes: {
          location: name,
          type: 'room-sensor',
          metric
        },
        sanity: valueSanity[metric] || valueSanity.default,
        server: hmiServer,
        handlers: { get }
      });
    });
  });
}

function obiLightHmi(light, hmiServer) {
  const { name, instance, type } = light;

  const hmi = new HmiElement({
    name,
    attributes: {
      type: 'light',
      subtype: type
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

  instance.on('change', () => {
    hmi.update();
  });
}

function lightsHmi(lights, hmiServer) {
  lights.forEach((light) => {
    const { type } = light;

    switch (type) {
      case 'OBI_JACK':
        obiLightHmi(light, hmiServer);
        break;
      default:
    }
  });
}


(function main() {
  const {
    config: {
      globals: {
        valueSanity
      }
    },
    hmiServer,
    doorSensors,
    roomSensors,
    lights
  } = global;

  doorSensorsHmi(doorSensors, hmiServer);
  roomSensorsHmi(roomSensors, hmiServer, valueSanity);
  lightsHmi(lights, hmiServer);
}());
