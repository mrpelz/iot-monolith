const { HmiElement } = require('../../libs/hmi');
const { sanity } = require('../../libs/utils/math');
const { camel } = require('../../libs/utils/string');
const { excludeKeys } = require('../../libs/utils/structures');

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
    attributes: excludeKeys(
      Object.assign({}, attributes, {
        subType: 'trend'
      }),
      'unit'
    ),
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
        hmi: hmiAttributes
      } = {}
    } = doorSensor;

    if (!hmiAttributes) return;

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

function outwardsDoorSensorsGroupHmi(instance, hmiServer) {
  const hmi = new HmiElement({
    name: 'outwardsDoorSensors',
    attributes: {
      category: 'security',
      label: '§{all} §{window}',
      section: 'global',
      sortCategory: '_top',
      subType: 'door',
      type: 'door-sensor'
    },
    server: hmiServer,
    getter: () => {
      return Promise.resolve(instance.isOpen);
    }
  });

  instance.on('change', () => {
    hmi.update();
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
        hmi: hmiAttributes
      } = {}
    } = sensor;

    if (!hmiAttributes) return;

    metrics.forEach((metric) => {
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
        hmi: hmiAttributes
      } = {}
    } = aggregate;

    if (!hmiAttributes) return;

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

function singleRelayLightHmi(light, hmiServer) {
  const {
    name,
    instance,
    attributes: {
      hmi: hmiAttributes
    } = {}
  } = light;

  if (!hmiAttributes) return;

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
      return Promise.resolve(instance.power);
    },
    settable: true
  });

  instance.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    instance.toggle();
  });
}

function lightsHmi(lights, hmiServer) {
  lights.forEach((light) => {
    const { type } = light;

    switch (type) {
      case 'SINGLE_RELAY':
        singleRelayLightHmi(light, hmiServer);
        break;
      default:
    }
  });
}

function lightGroupHmi(group, hmiServer) {
  const {
    name,
    instance,
    attributes: {
      hmi: hmiAttributes
    } = {}
  } = group;

  if (!hmiAttributes) return;

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
      return Promise.resolve(instance.power);
    },
    settable: true
  });

  instance.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    instance.toggle();
  });
}

function lightGroupsHmi(groups, hmiServer) {
  groups.forEach((group) => {
    lightGroupHmi(group, hmiServer);
  });
}

function allLightsGroupHmi(instance, hmiServer) {
  const hmi = new HmiElement({
    name: 'allLights',
    attributes: {
      category: 'lamps',
      label: '§{all} §{lamps}',
      section: 'global',
      setType: 'trigger',
      sortCategory: '_top',
      subType: 'binary-light',
      type: 'lighting'
    },
    server: hmiServer,
    getter: () => {
      return Promise.resolve(instance.power);
    },
    settable: true
  });

  instance.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    instance.toggle();
  });
}

function singleRelayFanHmi(fan, hmiServer) {
  const {
    name,
    instance,
    attributes: {
      hmi: hmiAttributes
    } = {}
  } = fan;

  if (!hmiAttributes) return;

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
      return Promise.resolve(instance.power);
    },
    settable: true
  });

  instance.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    instance.toggle();
  });
}

function fansHmi(fans, hmiServer) {
  fans.forEach((fan) => {
    const { type } = fan;

    switch (type) {
      case 'SINGLE_RELAY':
        singleRelayFanHmi(fan, hmiServer);
        break;
      default:
    }
  });
}

function securityHmi(instance, hmiServer) {
  const hmi = new HmiElement({
    name: 'security',
    attributes: {
      category: 'security',
      label: 'security-system',
      section: 'global',
      setType: 'trigger',
      sortCategory: '_top',
      type: 'security'
    },
    server: hmiServer,
    getter: () => {
      return Promise.resolve(instance.armed ? 'armed' : 'disarmed');
    },
    settable: true
  });

  instance.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    instance.toggle();
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
    allLightsGroup,
    doorSensors,
    fans,
    histories,
    hmiServer,
    lightGroups,
    lights,
    metricAggregates,
    outwardsDoorSensorsGroup,
    roomSensors,
    security
  } = global;

  doorSensorsHmi(doorSensors, hmiServer);
  outwardsDoorSensorsGroupHmi(outwardsDoorSensorsGroup, hmiServer);
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
  allLightsGroupHmi(allLightsGroup, hmiServer);
  lightGroupsHmi(lightGroups, hmiServer);
  fansHmi(fans, hmiServer);
  securityHmi(security, hmiServer);
}());
