const { CachedRoomSensor } = require('../../libs/room-sensor');

function createSensor(sensor) {
  const {
    host,
    port,
    metrics,
    name
  } = sensor;

  try {
    return new CachedRoomSensor({
      host,
      port,
      metrics,
      name
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
    const instance = createSensor(sensor);
    if (!instance) return null;

    instance.connect();

    const { name = null, isRoom = false, metrics = [] } = sensor;

    return {
      name,
      isRoom,
      metrics,
      instance
    };
  }).filter(Boolean);
}());
