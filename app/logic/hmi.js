const { HmiElement } = require('../../libs/hmi');
const { sanity } = require('../../libs/utils/math');
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
        label: 'door',
        subType: 'door',
        type: 'door-sensor'
      }, hmiAttributes),
      server: hmiServer,
      getter: () => {
        return Promise.resolve(instance.isOpen);
      }
    });

    instance.on('change', () => {
      hmi.update();
    });
  });
}

function roomSensorsHmi(roomSensors, hmiServer, unitMap, valueSanity) {
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
      const getter = () => {
        return instance.getMetric(metric).then((value) => {
          return value === null ? null : sanity(
            value,
            valueSanity[metric] || valueSanity.default
          );
        });
      };

      /* eslint-disable-next-line no-new */
      new HmiElement({
        name: hmiName,
        attributes: Object.assign({
          category: 'air',
          label: metric,
          subType: 'single-sensor',
          type: 'environmental-sensor',
          unit: unitMap[metric] || null
        }, hmiAttributes),
        server: hmiServer,
        getter
      });
    });
  });
}

function metricAggrgatesHmi(metricAggregates, hmiServer, unitMap, valueSanity) {
  metricAggregates.forEach((aggregate) => {
    const {
      group,
      instance,
      metric,
      type,
      attributes: {
        hmi: hmiAttributes = {}
      } = {}
    } = aggregate;

    const hmiName = camel(group, metric, type);
    const getter = () => {
      return instance.get().then((value) => {
        return value === null ? null : sanity(
          value,
          valueSanity[metric] || valueSanity.default
        );
      });
    };

    /* eslint-disable-next-line no-new */
    new HmiElement({
      name: hmiName,
      attributes: Object.assign({
        category: `§{air} (§{${type}})`,
        label: metric,
        section: 'global',
        sortCategory: 'air',
        subLabel: group,
        subType: 'aggregate-value',
        type: 'environmental-sensor',
        unit: unitMap[metric] || null
      }, hmiAttributes),
      server: hmiServer,
      getter
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
      label: 'lamp',
      setType: 'trigger',
      subType: 'binary-light',
      type: 'lighting'
    }, hmiAttributes),
    server: hmiServer,
    getter: () => {
      return Promise.resolve(instance.relayState);
    },
    settable: true
  });

  instance.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    instance.relay(!instance.relayState);
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
      label: 'fan',
      setType: 'trigger',
      type: 'fan'
    }, hmiAttributes),
    server: hmiServer,
    getter: () => {
      return Promise.resolve(instance.relayState);
    },
    settable: true
  });

  instance.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    instance.relay(!instance.relayState);
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
        unitMap,
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
  roomSensorsHmi(roomSensors, hmiServer, unitMap, valueSanity);
  metricAggrgatesHmi(metricAggregates, hmiServer, unitMap, valueSanity);
  lightsHmi(lights, hmiServer);
  fansHmi(fans, hmiServer);
}());
