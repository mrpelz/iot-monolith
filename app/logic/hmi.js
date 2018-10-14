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
        type: 'door',
        category: 'Türen und Fenster'
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

function roomSensorsHmi(roomSensors, hmiServer, valueSanity, labels, units) {
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
          displayName: labels[metric] || hmiName,
          displayUnit: units[metric] || null,
          type: 'room-sensor',
          category: 'Luft'
        }, hmiAttributes),
        sanity: valueSanity[metric] || valueSanity.default,
        server: hmiServer,
        handlers: { get }
      });
    });
  });
}

function metricAggrgatesHmi(metricAggregates, hmiServer, valueSanity, labels, units) {
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
        displayName: labels[metric] || name,
        displayUnit: units[metric] || null,
        type: 'metric-aggregate',
        category: 'Luft'
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
    type,
    attributes: {
      hmi: hmiAttributes = {}
    } = {}
  } = light;

  const hmi = new HmiElement({
    name,
    attributes: Object.assign({
      type: 'light',
      subtype: type,
      category: 'Lampen'
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

function obiFanHmi(fan, hmiServer) {
  const {
    name,
    instance,
    type,
    attributes: {
      hmi: hmiAttributes = {}
    } = {}
  } = fan;

  const hmi = new HmiElement({
    name,
    attributes: Object.assign({
      type: 'fan',
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
        valueSanity,
        labels,
        units
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
  roomSensorsHmi(roomSensors, hmiServer, valueSanity, labels, units);
  metricAggrgatesHmi(metricAggregates, hmiServer, valueSanity, labels, units);
  lightsHmi(lights, hmiServer);
  fansHmi(fans, hmiServer);
}());
