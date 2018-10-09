const { DoorSensor } = require('../../libs/door-sensor');
const { StateFile } = require('../../libs/state-files');
const { resolveAlways } = require('../../libs/utils/oop');

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

function addPersistenceHandler(name, instance) {
  const persist = new StateFile(`doorSensor_${name}`);

  const handleChange = () => {
    persist.set({
      isOpen: instance.isOpen,
      isTampered: instance.isTampered
    });
  };

  const handleInit = async () => {
    const {
      isOpen = null,
      isTampered = false
    } = await resolveAlways(persist.get()) || {};

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
    ev1527Server
  } = global;

  global.doorSensors = doorSensors.map((sensor) => {
    const { disable = false, name, id } = sensor;
    if (disable || !name || !id) return null;

    const instance = createSensor(sensor, ev1527Server);
    if (!instance) return null;

    instance.log.friendlyName(name);

    addPersistenceHandler(name, instance);

    return Object.assign(sensor, {
      instance
    });
  }).filter(Boolean);
}());
