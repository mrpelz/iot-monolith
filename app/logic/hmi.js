const { HmiElement } = require('../../libs/hmi');
const { sanity } = require('../../libs/utils/math');
const { camel } = require('../../libs/utils/string');
const { excludeKeys } = require('../../libs/utils/structures');
const { resolveAlways } = require('../../libs/utils/oop');

function setUpConnectionHmi(element, subGroup, hmiServer) {
  const {
    name,
    instance
  } = element;

  let connected = false;

  const hmi = new HmiElement({
    name: camel(name, 'connection'),
    attributes: {
      category: 'connections',
      group: camel(name, 'connection'),
      section: 'tech',
      showSubGroup: Boolean(subGroup),
      subGroup,
      type: 'connection'
    },
    server: hmiServer,
    getter: async () => {
      return connected ? 'connected' : 'disconnected';
    }
  });

  instance.on('connect', () => {
    connected = true;
    hmi.update();
  });
  instance.on('disconnect', () => {
    connected = false;
    hmi.update();
  });
}

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

    if (factor > trendFactorThreshold) return 'trendUp';
    if (factor < (trendFactorThreshold * -1)) return 'trendDown';
    return false;
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
        group: 'door',
        subType: 'door',
        type: 'door-sensor'
      }, hmiAttributes),
      server: hmiServer,
      getter: () => {
        return Promise.resolve((() => {
          if (instance.isOpen) return 'open';
          if (instance.isOpen === false) return 'close';
          return 'unknown';
        })());
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
      group: '§{all} §{window}',
      section: 'global',
      sortCategory: '_top',
      sortGroup: 'door',
      subType: 'door',
      type: 'door-sensor'
    },
    server: hmiServer,
    getter: () => {
      return Promise.resolve((() => {
        if (instance.isOpen) return 'open';
        if (instance.isOpen === false) return 'close';
        return 'unknown';
      })());
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

    setUpConnectionHmi(sensor, 'room-sensor', hmiServer);

    if (!hmiAttributes) return;

    metrics.forEach((metric) => {
      // don't show pressure for single rooms, except für metrics shown on global
      if (
        hmiAttributes.section !== 'global'
        && metric === 'pressure'
      ) return;

      const hmiName = camel(name, metric);
      const handleValue = (value) => {
        if (value === null || Number.isNaN(value)) return null;

        if (typeof value === 'number') {
          return sanity(
            value,
            valueSanity[metric] || valueSanity.default
          );
        }

        if (typeof value === 'boolean') {
          return value ? 'yes' : 'no';
        }

        return value;
      };

      const attributes = Object.assign({
        category: metric === 'movement' ? 'security' : 'air',
        group: metric,
        subType: 'single-sensor',
        type: metric === 'movement' ? 'pir' : 'environmental-sensor',
        unit: unitMap[metric] || undefined
      }, hmiAttributes);

      const hmi = new HmiElement({
        name: hmiName,
        attributes,
        server: hmiServer,
        getter: () => {
          return instance.getMetric(metric, 2000).then(handleValue);
        }
      });

      instance.on(metric, () => {
        hmi.update();
      });

      setUpHistoryTrendHmi(histories, hmiName, attributes, hmiServer, trendFactorThreshold);
    });
  });
}

function allMovementGroupHmi(instance, hmiServer) {
  if (!instance) return;

  const hmi = new HmiElement({
    name: 'allMovement',
    attributes: {
      category: 'security',
      group: 'movement',
      section: 'global',
      sortCategory: '_top',
      type: 'pir'
    },
    server: hmiServer,
    getter: () => {
      return Promise.resolve(instance.getState().includes(true) ? 'yes' : 'no');
    }
  });

  instance.on('movement', () => {
    hmi.update();
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
      groupLabel: metric,
      section: 'global',
      sortCategory: 'air',
      sortGroup: metric,
      subGroup: group,
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

  setUpConnectionHmi(light, 'single-relay light', hmiServer);

  if (!hmiAttributes) return;

  const hmi = new HmiElement({
    name,
    attributes: Object.assign({
      category: 'lamps',
      group: 'lamp',
      setType: 'trigger',
      type: 'binary-light'
    }, hmiAttributes),
    server: hmiServer,
    getter: () => {
      return Promise.resolve(instance.power ? 'on' : 'off');
    },
    settable: true
  });

  instance.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    resolveAlways(instance.toggle());
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
      group: 'lamp',
      setType: 'trigger',
      type: 'binary-light'
    }, hmiAttributes),
    server: hmiServer,
    getter: () => {
      return Promise.resolve(instance.power ? 'on' : 'off');
    },
    settable: true
  });

  instance.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    resolveAlways(instance.toggle());
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
      group: '§{all} §{lamps}',
      section: 'global',
      setType: 'trigger',
      sortCategory: '_top',
      type: 'binary-light'
    },
    server: hmiServer,
    getter: () => {
      return Promise.resolve(instance.power ? 'on' : 'off');
    },
    settable: true
  });

  instance.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    resolveAlways(instance.toggle());
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

  setUpConnectionHmi(fan, 'single-relay fan', hmiServer);

  if (!hmiAttributes) return;

  const hmi = new HmiElement({
    name,
    attributes: Object.assign({
      category: 'other',
      group: 'fan',
      setType: 'trigger',
      type: 'fan'
    }, hmiAttributes),
    server: hmiServer,
    getter: () => {
      return Promise.resolve(instance.power ? 'on' : 'off');
    },
    settable: true
  });

  instance.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    resolveAlways(instance.toggle());
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

function ventHmi(vent, hmiServer) {
  if (!vent) return;

  const { instance, name } = vent;

  setUpConnectionHmi(vent, 'vent', hmiServer);

  const hmiAttributes = {
    category: 'ahu-control',
    group: '§{ahu}-§{target}',
    section: 'ahu',
    sortCategory: '_top',
    type: 'ahu'
  };

  /* eslint-disable-next-line no-new */
  new HmiElement({
    name: `${name}ActualIn`,
    attributes: Object.assign({}, hmiAttributes, {
      group: 'ahu-in',
      sortGroup: 'flow-rate',
      subType: 'single-sensor',
      type: 'environmental-sensor',
      unit: 'm3/h'
    }),
    server: hmiServer,
    getter: () => {
      return instance.getActualIn();
    }
  });

  /* eslint-disable-next-line no-new */
  new HmiElement({
    name: `${name}ActualOut`,
    attributes: Object.assign({}, hmiAttributes, {
      group: 'ahu-out',
      sortGroup: 'flow-rate',
      subType: 'single-sensor',
      type: 'environmental-sensor',
      unit: 'm3/h'
    }),
    server: hmiServer,
    getter: () => {
      return instance.getActualOut();
    }
  });

  const hmiTarget = new HmiElement({
    name: `${name}Target`,
    attributes: Object.assign({
      subType: 'read',
      unit: 'percent'
    }, hmiAttributes),
    server: hmiServer,
    getter: () => {
      return Promise.resolve(
        instance.targetPercentage
      );
    }
  });

  const hmiTargetUp = new HmiElement({
    name: `${name}TargetUp`,
    attributes: Object.assign({
      label: 'increase',
      setType: 'trigger',
      subType: 'increase'
    }, hmiAttributes),
    server: hmiServer,
    settable: true
  });

  const hmiTargetDown = new HmiElement({
    name: `${name}TargetDown`,
    attributes: Object.assign({
      label: 'decrease',
      setType: 'trigger',
      subType: 'decrease'
    }, hmiAttributes),
    server: hmiServer,
    settable: true
  });

  instance.on('change', () => {
    hmiTarget.update();
  });

  hmiTargetUp.on('set', () => {
    const target = (instance.target === instance.maxTarget)
      ? instance.minTarget
      : instance.target + 1;

    resolveAlways(instance.setTarget(target));
  });

  hmiTargetDown.on('set', () => {
    const target = (instance.target === instance.minTarget)
      ? instance.maxTarget
      : instance.target - 1;

    resolveAlways(instance.setTarget(target));
  });
}

function floodlightAlarmClockHmi(floodlightAlarmClock, hmiServer) {
  const hmi = new HmiElement({
    name: 'floodlightAlarmClock',
    attributes: {
      category: 'lamps',
      group: '§{flood-lamp}-Wecker',
      section: 'schlafzimmer',
      setType: 'trigger',
      type: 'binary-light'
    },
    server: hmiServer,
    getter: () => {
      return Promise.resolve(floodlightAlarmClock.state ? 'on' : 'off');
    },
    settable: true
  });

  hmi.on('set', () => {
    if (floodlightAlarmClock.state) {
      floodlightAlarmClock.disarm();
    } else {
      floodlightAlarmClock.arm();
    }

    hmi.update();
  });
}

function securityHmi(instance, hmiServer) {
  const addHmi = (level) => {
    const hmi = new HmiElement({
      name: `security${level}`,
      attributes: {
        category: 'security',
        group: `§{security-system} L${level}`,
        section: 'global',
        setType: 'trigger',
        sortCategory: '_top',
        sortGroup: 'security-system',
        type: 'security'
      },
      server: hmiServer,
      getter: () => {
        return Promise.resolve((() => {
          if (instance.level === level) {
            if (instance.armDelay) return 'delayed';
            if (instance.triggered) return 'triggered';
            if (instance.armed) return 'on';
          }

          return 'off';
        })());
      },
      settable: true
    });

    instance.on('change', () => {
      hmi.update();
    });

    hmi.on('set', () => {
      instance.toggle(level);
    });
  };

  addHmi(1); // include levels <= 1 (e.g. alarm for when no one is home)
  addHmi(0); // include levels <= 0 (e.g. alarm for when people are sleeping)
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
    allMovementGroup,
    doorSensors,
    fans,
    floodlightAlarmClock,
    histories,
    hmiServer,
    lightGroups,
    lights,
    metricAggregates,
    outwardsDoorSensorsGroup,
    roomSensors,
    security,
    vent
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
  allMovementGroupHmi(allMovementGroup, hmiServer);
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
  ventHmi(vent, hmiServer);
  floodlightAlarmClockHmi(floodlightAlarmClock, hmiServer);
  securityHmi(security, hmiServer);
}());
