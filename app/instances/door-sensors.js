const { DoorSensor } = require('../../libs/door-sensor');
const { DoorSensorGroup } = require('../../libs/group');
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

function addSecurity(name, instance, security) {
  const trigger = security.addElement(name);

  instance.on('change', () => {
    if (instance.isOpen) {
      trigger(true, 'was opened');
      return;
    }

    trigger(false, 'was closed');
  });
}

function createDoorSensors(doorSensors, ev1527Server, doorDb, security) {
  return doorSensors.map((sensor) => {
    const { disable = false, name, id } = sensor;
    if (disable || !name || !id) return null;

    const instance = createSensor(sensor, ev1527Server);
    if (!instance) return null;

    instance.log.friendlyName(name);

    addPersistenceHandler(name, instance, doorDb);
    addSecurity(name, instance, security);

    return Object.assign(sensor, {
      instance
    });
  }).filter(Boolean);
}

function createOutwardsDoorSensorsGroup(allDoorSensors) {
  const doorSensors = allDoorSensors.filter((sensor) => {
    const {
      attributes: {
        security: {
          outwards = false
        } = {}
      } = {}
    } = sensor;

    return outwards;
  }).map(({ instance }) => {
    return instance;
  });

  try {
    return new DoorSensorGroup(doorSensors);
  } catch (e) {
    return null;
  }
}

(function main() {
  const {
    config: {
      'door-sensors': doorSensors
    },
    db,
    ev1527Server,
    security
  } = global;

  const doorDb = getKey(db, 'doors');

  global.doorSensors = createDoorSensors(doorSensors, ev1527Server, doorDb, security);
  global.outwardsDoorSensorsGroup = createOutwardsDoorSensorsGroup(global.doorSensors);
}());
