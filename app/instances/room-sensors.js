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
    const { name, isRoom = false, metrics = [] } = sensor;
    if (!name || isRoom === undefined || !metrics.length) return null;

    const instance = createSensor(sensor);
    if (!instance) return null;

    instance.connect();

    return {
      name,
      isRoom,
      metrics,
      instance
    };
  }).filter(Boolean);
}());
