const { HmiElement } = require('../../libs/hmi');
const { sanity } = require('../../libs/utils/math');
const { camel } = require('../../libs/utils/string');

function setUpHistoryTrendHmi(
  histories,
  hmiName,
  attributes,
  hmiServer,
  trendFactorThreshold
) {
  const history = histories.find(({ name: n }) => {
    return n === hmiName;
  });

  if (!history) return;

  const trend = async () => {
    const { factor } = history.trend.get();

    if (factor > trendFactorThreshold) return 1;
    if (factor < (trendFactorThreshold * -1)) return -1;
    return 0;
  };

  /* eslint-disable-next-line no-new */
  new HmiElement({
    name: camel(hmiName, 'trend'),
    attributes: Object.assign({}, attributes, {
      subType: 'trend'
    }),
    server: hmiServer,
    getter: trend
  });
}

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

function roomSensorsHmi(
  roomSensors,
  histories,
  hmiServer,
  unitMap,
  valueSanity,
  trendFactorThreshold
) {
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
      if (metric === 'pressure') return;

      const hmiName = camel(name, metric);
      const getter = () => {
        return instance.getMetric(metric).then((value) => {
          return value === null ? null : sanity(
            value,
            valueSanity[metric] || valueSanity.default
          );
        });
      };

      const attributes = Object.assign({
        category: 'air',
        group: metric,
        label: metric,
        subType: 'single-sensor',
        type: 'environmental-sensor',
        unit: unitMap[metric] || null
      }, hmiAttributes);

      /* eslint-disable-next-line no-new */
      new HmiElement({
        name: hmiName,
        attributes,
        server: hmiServer,
        getter
      });

      setUpHistoryTrendHmi(histories, hmiName, attributes, hmiServer, trendFactorThreshold);
    });
  });
}

function metricAggrgatesHmi(
  metricAggregates,
  histories,
  hmiServer,
  unitMap,
  valueSanity,
  trendFactorThreshold
) {
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

    const attributes = Object.assign({
      category: `§{air} (§{${type}})`,
      group: camel(group, metric),
      label: metric,
      section: 'global',
      sortCategory: 'air',
      sortGroup: metric,
      subLabel: group,
      subType: 'aggregate-value',
      type: 'environmental-sensor',
      unit: unitMap[metric] || null
    }, hmiAttributes);

    /* eslint-disable-next-line no-new */
    new HmiElement({
      name: hmiName,
      attributes,
      server: hmiServer,
      getter
    });

    setUpHistoryTrendHmi(histories, hmiName, attributes, hmiServer, trendFactorThreshold);
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
        valueSanity,
        trendFactorThreshold
      }
    },
    doorSensors,
    fans,
    histories,
    hmiServer,
    lights,
    metricAggregates,
    roomSensors
  } = global;

  doorSensorsHmi(doorSensors, hmiServer);
  roomSensorsHmi(
    roomSensors,
    histories,
    hmiServer,
    unitMap,
    valueSanity,
    trendFactorThreshold
  );
  metricAggrgatesHmi(
    metricAggregates,
    histories,
    hmiServer,
    unitMap,
    valueSanity,
    trendFactorThreshold
  );
  lightsHmi(lights, hmiServer);
  fansHmi(fans, hmiServer);
}());
