const { RoomSensor } = require('../../libs/room-sensor');
const { PushMetricGroup } = require('../../libs/group');

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

function addSecurity(name, instance, security) {
  const metric = 'movement';

  const trigger = security.addElement(name);

  instance.on(metric, () => {
    const value = instance.getState(metric);

    if (value === null) return;

    if (value) {
      trigger('movement start');
      return;
    }

    trigger('movement stop');
  });
}

function createRoomSensors(roomSensors, security) {
  return roomSensors.map((sensor) => {
    const { disable = false, name, metrics = [] } = sensor;
    if (disable || !name || !metrics.length) return null;

    const instance = createSensor(sensor);
    if (!instance) return null;

    instance.log.friendlyName(name);
    instance.connect();

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
      'room-sensors': roomSensors
    },
    security
  } = global;

  global.roomSensors = createRoomSensors(roomSensors, security);
  global.allMovementGroup = createAllMovementGroup(global.roomSensors);
}());
