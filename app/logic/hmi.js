const { HmiElement } = require('../../libs/hmi');
const { camel } = require('../../libs/utils/string');

function doorSensorsHmi(doorSensors, hmiServer) {
  doorSensors.forEach((doorSensor) => {
    const {
      name,
      instance,
      attributes: {
        hmi: hmiAttributes = {}
      } = {}
    } = doorSensor;

    const hmi = new HmiElement({
      name,
      attributes: Object.assign({ type: 'door' }, hmiAttributes),
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

function roomSensorsHmi(roomSensors, hmiServer, valueSanity, strings) {
  roomSensors.forEach((sensor) => {
    const {
      name,
      instance,
      metrics,
      attributes: {
        hmi: hmiAttributes = {}
      } = {}
    } = sensor;

    return metrics.forEach((metric) => {
      const hmiName = camel(name, metric);
      const get = instance.access('get', metric);

      /* eslint-disable-next-line no-new */
      new HmiElement({
        name: hmiName,
        attributes: Object.assign({
          displayName: strings[metric] || hmiName,
          type: 'room-sensor'
        }, hmiAttributes),
        sanity: valueSanity[metric] || valueSanity.default,
        server: hmiServer,
        handlers: { get }
      });
    });
  });
}

function obiLightHmi(light, hmiServer) {
  const {
    name,
    instance,
    type,
    attributes: {
      hmi: hmiAttributes = {}
    } = {}
  } = light;

  const hmi = new HmiElement({
    name,
    attributes: Object.assign({
      type: 'light',
      subtype: type
    }, hmiAttributes),
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
      hmi: {
        valueSanity,
        strings
      }
    },
    hmiServer,
    doorSensors,
    roomSensors,
    lights
  } = global;

  doorSensorsHmi(doorSensors, hmiServer);
  roomSensorsHmi(roomSensors, hmiServer, valueSanity, strings);
  lightsHmi(lights, hmiServer);
}());
