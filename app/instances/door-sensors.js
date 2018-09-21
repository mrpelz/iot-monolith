const { DoorSensor } = require('../../libs/door-sensor');

function createSensor(sensor, server) {
  const {
    id
  } = sensor;

  try {
    return new DoorSensor({
      id,
      server
    });
  } catch (e) {
    return null;
  }
}

(function main() {
  const {
    config: {
      'door-sensors': doorSensors
    },
    ev1527Server
  } = global;

  global.doorSensors = doorSensors.map((sensor) => {
    const { name, id } = sensor;
    if (!name || !id) return null;

    const instance = createSensor(sensor, ev1527Server);
    if (!instance) return null;

    return {
      name,
      instance
    };
  }).filter(Boolean);
}());
