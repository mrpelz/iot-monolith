const { SingleRelay } = require('../../libs/single-relay');
const { getKey } = require('../../libs/utils/structures');

function createSingleRelayLight(light) {
  const {
    host,
    port
  } = light;

  try {
    return new SingleRelay({
      host,
      port
    });
  } catch (e) {
    return null;
  }
}

function addPersistenceHandler(name, instance, lightDb) {
  const handleChange = () => {
    lightDb[name] = {
      power: instance.powerSetpoint
    };
  };

  const handleInit = () => {
    const {
      power = false
    } = lightDb[name] || {};

    instance.powerSetpoint = power;

    instance.on('set', handleChange);
    handleChange();
  };

  handleInit();
}

(function main() {
  const {
    config: {
      lights
    },
    db
  } = global;

  const lightDb = getKey(db, 'lights');

  global.lights = lights.map((light) => {
    const {
      disable = false,
      host,
      name,
      type
    } = light;
    if (disable || !name || !type) return null;

    let instance;

    switch (type) {
      case 'SINGLE_RELAY':
        instance = createSingleRelayLight(light);
        break;
      default:
    }

    if (!instance) return null;

    instance.log.friendlyName(`${name} (HOST: ${host})`);

    addPersistenceHandler(name, instance, lightDb);

    instance.connect();

    return Object.assign(light, {
      instance
    });
  }).filter(Boolean);
}());
