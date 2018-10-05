const { CachedRoomSensor } = require('../../libs/room-sensor');

function createSensor(sensor) {
  const {
    host,
    port,
    metrics
  } = sensor;

  try {
    return new CachedRoomSensor({
      host,
      port,
      metrics
    });
  } catch (e) {
    return null;
  }
}

(function main() {
  const {
    config: {
      'room-sensors': roomSensors
    }
  } = global;

  global.roomSensors = roomSensors.map((sensor) => {
    const { disable = false, name, metrics = [] } = sensor;
    if (disable || !name || !metrics.length) return null;

    const instance = createSensor(sensor);
    if (!instance) return null;

    instance.log.friendlyName(name);
    instance.connect();

    return Object.assign(sensor, {
      instance
    });
  }).filter(Boolean);
}());
