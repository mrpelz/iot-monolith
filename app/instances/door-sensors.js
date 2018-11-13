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

function addPersistenceHandler(name, instance, doorDb) {
  const handleChange = () => {
    doorDb[name] = {
      isOpen: instance.isOpen
    };
  };

  const handleInit = () => {
    const {
      isOpen = null
    } = doorDb[name] || {};

    instance.isOpen = isOpen;

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

  const doorDb = getKey(db, 'doors');

  global.doorSensors = doorSensors.map((sensor) => {
    const { disable = false, name, id } = sensor;
    if (disable || !name || !id) return null;

    const instance = createSensor(sensor, ev1527Server);
    if (!instance) return null;

    instance.log.friendlyName(name);

    addPersistenceHandler(name, instance, doorDb);

    return Object.assign(sensor, {
      instance
    });
  }).filter(Boolean);
}());
