const { RoomSensor } = require('../../libs/room-sensor');
const { PushMetricGroup } = require('../../libs/group');
const { HmiElement } = require('../../libs/hmi');
const { sanity } = require('../../libs/utils/math');
const { resolveAlways } = require('../../libs/utils/oop');
const { camel } = require('../../libs/utils/string');
const { every, CallTiming, RecurringMoment } = require('../../libs/utils/time');

const { setUpConnectionHmi, setUpHistoryTrendHmi } = require('../utils/hmi');


const securityMetric = 'movement';

function createSensor(sensor) {
  const {
    host,
    port,
    metrics
  } = sensor;

  try {
    return new RoomSensor({
      host,
      port,
      metrics
    });
  } catch (e) {
    return null;
  }
}

function addSchedule(metrics, instance, metricSchedule, scheduler) {
  metrics.filter((metric) => {
    return Object.keys(metricSchedule).includes(metric);
  }).forEach((metric) => {
    const { [metric]: config } = metricSchedule;

    new RecurringMoment(
      { scheduler },
      every.parse(config)
    ).on('hit', () => {
      resolveAlways(instance.requestMetric(metric));
    });
  });
}

function addSecurity(name, instance, security) {
  const trigger = security.addElement(name, 1);

  instance.on(securityMetric, () => {
    const value = instance.getState(securityMetric);

    if (value === null) return;

    if (value) {
      trigger(true, 'movement start');
      return;
    }

    trigger(false, 'movement stop');
  });
}

function createRoomSensors(roomSensors, metricSchedule, scheduler, security) {
  return roomSensors.map((sensor) => {
    const {
      disable = false,
      host,
      metrics = [],
      name
    } = sensor;
    if (disable || !name || !metrics.length) return null;

    const instance = createSensor(sensor);
    if (!instance) return null;

    instance.log.friendlyName(`${name} (HOST: ${host})`);
    instance.connect();

    addSchedule(metrics, instance, metricSchedule, scheduler);
    addSecurity(name, instance, security);

    return Object.assign(sensor, {
      instance
    });
  }).filter(Boolean);
}

function createAllMovementGroup(allRoomSensors) {
  const roomSensors = allRoomSensors.filter(({ metrics }) => {
    return metrics.includes(securityMetric);
  }).map(({ instance }) => {
    return instance;
  });

  if (!roomSensors.length) return null;

  try {
    return new PushMetricGroup(securityMetric, roomSensors);
  } catch (e) {
    return null;
  }
}

function create(config, data) {
  const {
    globals: {
      metricSchedule
    },
    'room-sensors': roomSensorsConfig
  } = config;

  const {
    scheduler,
    security
  } = data;

  const roomSensors = createRoomSensors(roomSensorsConfig, metricSchedule, scheduler, security);
  const allMovementGroup = createAllMovementGroup(roomSensors);

  Object.assign(data, {
    roomSensors,
    allMovementGroup
  });
}


function roomSensorsToPrometheus(roomSensors, prometheus) {
  roomSensors.forEach((sensor) => {
    const { name, instance, metrics } = sensor;

    metrics.forEach((metric) => {
      if (metric === 'movement') return;
      if (metric === 'pm025') return;
      if (metric === 'pm10') return;

      prometheus.metric(
        metric,
        {
          location: name,
          type: 'room-sensor'
        },
        () => {
          return instance.getMetric(metric);
        },
        () => {
          return instance.getMetricTime(metric);
        }
      );
    });
  });
}

function roomSensorsMovementToPrometheus(roomSensors, prometheus) {
  const metric = 'movement';

  roomSensors.filter(({ metrics }) => {
    return metrics.includes(metric);
  }).forEach((sensor) => {
    const timing = new CallTiming();

    const { name, instance } = sensor;

    prometheus.metric(
      metric,
      {
        location: name,
        type: 'room-sensor'
      },
      async () => {
        return (await instance.getMetric(metric)) || timing.check(10000);
      }
    );

    instance.on(metric, () => {
      if (!instance.getMetric(metric)) return;

      timing.hit();
    });
  });
}

function roomSensorsSlowMetricsToPrometheus(roomSensors, prometheus) {
  roomSensors.forEach((sensor) => {
    const { name, instance, metrics } = sensor;

    metrics.forEach((metric) => {
      if ((() => {
        if (metric === 'pm025') return false;
        if (metric === 'pm10') return false;
        return true;
      })()) return;

      prometheus.slowMetric(
        metric,
        {
          location: name,
          type: 'room-sensor'
        },
        () => {
          return instance.getMetric(metric, 2000);
        }
      );
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

function manage(config, data) {
  const {
    hmi: {
      trendFactorThreshold,
      unitMap,
      valueSanity
    }
  } = config;

  const {
    allMovementGroup,
    histories,
    hmiServer,
    prometheus,
    roomSensors
  } = data;

  roomSensorsToPrometheus(roomSensors, prometheus);
  roomSensorsMovementToPrometheus(roomSensors, prometheus);
  roomSensorsSlowMetricsToPrometheus(roomSensors, prometheus);
  roomSensorsHmi(
    roomSensors,
    histories,
    hmiServer,
    unitMap,
    valueSanity,
    trendFactorThreshold
  );
  allMovementGroupHmi(allMovementGroup, hmiServer);
}


module.exports = {
  create,
  manage
};
