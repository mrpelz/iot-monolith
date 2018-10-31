const { DoorSensor } = require('../../libs/door-sensor');
const { getKey } = require('../../libs/utils/structures');

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

function addPersistenceHandler(name, instance, doors) {
  const handleChange = () => {
    doors[name] = {
      isOpen: instance.isOpen,
      isTampered: instance.isTampered
    };
  };

  const handleInit = () => {
    const {
      isOpen = null,
      isTampered = false
    } = doors[name] || {};

    instance.isOpen = isOpen;
    instance.isTampered = isTampered;

    instance.on('change', handleChange);
    handleChange();
  };

  handleInit();
}

(function main() {
  const {
    config: {
      'door-sensors': doorSensors
    },
    db,
    ev1527Server
  } = global;

  const doors = getKey(db, 'doors');

  global.doorSensors = doorSensors.map((sensor) => {
    const { disable = false, name, id } = sensor;
    if (disable || !name || !id) return null;

    const instance = createSensor(sensor, ev1527Server);
    if (!instance) return null;

    instance.log.friendlyName(name);

    addPersistenceHandler(name, instance, doors);

    return Object.assign(sensor, {
      instance
    });
  }).filter(Boolean);
}());
