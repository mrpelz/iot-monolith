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
      attributes: Object.assign({
        category: 'doors',
        control: 'door',
        type: 'door-sensor',
        subtype: 'door'
      }, hmiAttributes),
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
      const get = () => {
        return instance.getMetric(metric);
      };

      /* eslint-disable-next-line no-new */
      new HmiElement({
        name: hmiName,
        attributes: Object.assign({
          category: 'air',
          control: metric,
          type: 'environmental-sensor',
          subtype: 'single-sensor'
        }, hmiAttributes),
        sanity: valueSanity[metric] || valueSanity.default,
        server: hmiServer,
        handlers: { get }
      });
    });
  });
}

function metricAggrgatesHmi(metricAggregates, hmiServer, valueSanity) {
  metricAggregates.forEach((aggregate) => {
    const {
      name,
      instance,
      metric,
      attributes: {
        hmi: hmiAttributes = {}
      }
    } = aggregate;

    const { get } = instance;

    /* eslint-disable-next-line no-new */
    new HmiElement({
      name,
      attributes: Object.assign({
        category: 'air',
        control: metric,
        type: 'environmental-sensor',
        subtype: 'aggregate-value'
      }, hmiAttributes),
      sanity: valueSanity[metric] || valueSanity.default,
      server: hmiServer,
      handlers: { get }
    });
  });
}

function obiLightHmi(light, hmiServer) {
  const {
    name,
    instance,
    attributes: {
      hmi: hmiAttributes = {}
    } = {}
  } = light;

  const hmi = new HmiElement({
    name,
    attributes: Object.assign({
      category: 'lamps',
      control: 'lamp',
      type: 'lighting',
      setType: 'trigger',
      subtype: 'binary-light'
    }, hmiAttributes),
    server: hmiServer,
    handlers: {
      get: () => {
        return Promise.resolve(instance.relayState);
      },
      set: () => {
        return instance.relay(!instance.relayState);
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

function obiFanHmi(fan, hmiServer) {
  const {
    name,
    instance,
    attributes: {
      hmi: hmiAttributes = {}
    } = {}
  } = fan;

  const hmi = new HmiElement({
    name,
    attributes: Object.assign({
      category: 'other',
      control: 'fan',
      type: 'fan',
      setType: 'trigger',
    }, hmiAttributes),
    server: hmiServer,
    handlers: {
      get: () => {
        return Promise.resolve(instance.relayState);
      },
      set: () => {
        return instance.relay(!instance.relayState);
      }
    }
  });

  instance.on('change', () => {
    hmi.update();
  });
}

function fansHmi(fans, hmiServer) {
  fans.forEach((fan) => {
    const { type } = fan;

    switch (type) {
      case 'OBI_JACK':
        obiFanHmi(fan, hmiServer);
        break;
      default:
    }
  });
}


(function main() {
  const {
    config: {
      hmi: {
        valueSanity
      }
    },
    doorSensors,
    hmiServer,
    lights,
    fans,
    metricAggregates,
    roomSensors
  } = global;

  doorSensorsHmi(doorSensors, hmiServer);
  roomSensorsHmi(roomSensors, hmiServer, valueSanity);
  metricAggrgatesHmi(metricAggregates, hmiServer, valueSanity);
  lightsHmi(lights, hmiServer);
  fansHmi(fans, hmiServer);
}());
