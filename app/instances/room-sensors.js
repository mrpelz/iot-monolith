const { RoomSensor } = require('../../libs/room-sensor');
const { PushMetricGroup } = require('../../libs/group');
const { every, RecurringMoment } = require('../../libs/utils/time');
const { resolveAlways } = require('../../libs/utils/oop');

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
      scheduler,
      every.parse(config)
    ).on('hit', () => {
      resolveAlways(instance.requestMetric(metric));
    });
  });
}

function addSecurity(name, instance, security) {
  const metric = 'movement';

  const trigger = security.addElement(name, 1);

  instance.on(metric, () => {
    const value = instance.getState(metric);

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
  const metric = 'movement';

  const roomSensors = allRoomSensors.filter(({ metrics }) => {
    return metrics.includes(metric);
  }).map(({ instance }) => {
    return instance;
  });

  if (!roomSensors.length) return null;

  try {
    return new PushMetricGroup(metric, roomSensors);
  } catch (e) {
    return null;
  }
}

(function main() {
  const {
    config: {
      globals: {
        metricSchedule
      },
      'room-sensors': roomSensors
    },
    scheduler,
    security
  } = global;

  global.roomSensors = createRoomSensors(roomSensors, metricSchedule, scheduler, security);
  global.allMovementGroup = createAllMovementGroup(global.roomSensors);
}());
