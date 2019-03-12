const { SingleRelay } = require('../../libs/single-relay');
const { H801, LedLight } = require('../../libs/led');
const { getKey } = require('../../libs/utils/structures');

function addPersistenceHandler(name, instance, lightDb, dbKey, instanceKey) {
  const handleChange = () => {
    lightDb[name] = {
      [dbKey]: instance[instanceKey]
    };
  };

  const handleInit = () => {
    const {
      [dbKey]: value = false
    } = lightDb[name] || {};

    instance[instanceKey] = value;

    instance.on('set', handleChange);
    handleChange();
  };

  handleInit();
}

function createSingleRelayLight(options) {
  const {
    host,
    port
  } = options;

  try {
    return new SingleRelay({
      host,
      port
    });
  } catch (e) {
    return null;
  }
}

function createSwitchLight(options, lightDb) {
  const instance = createSingleRelayLight(options);
  if (!instance) return null;

  const { name, host } = options;

  instance.log.friendlyName(`${name} (HOST: ${host})`);

  addPersistenceHandler(name, instance, lightDb, 'power', 'powerSetpoint');

  instance.connect();

  return Object.assign(options, {
    instance
  });
}

function createH801(options) {
  const {
    host,
    port
  } = options;

  try {
    return new H801({
      host,
      port
    });
  } catch (e) {
    return null;
  }
}

function createLedInstance(options, driver) {
  const {
    useChannel
  } = options;

  try {
    return new LedLight({
      driver,
      useChannel
    });
  } catch (e) {
    return null;
  }
}

function createLedLight(options, lightDb) {
  const { name: driverName, host, lights: l = [] } = options;

  const lightsOpts = l.filter(({ disable = false, name }) => {
    return name && !disable;
  });
  if (!lightsOpts.length) return null;

  const driver = createH801(options);
  if (!driver) return null;

  driver.log.friendlyName(`${driverName} (HOST: ${host})`);

  const lights = lightsOpts.map((lightOpts) => {
    const { name } = lightOpts;

    const instance = createLedInstance(lightOpts, driver);
    if (!instance) return null;

    addPersistenceHandler(name, instance, lightDb, 'brightness', 'brightnessSetpoint');

    return Object.assign(lightOpts, {
      instance
    });
  }).filter(Boolean);

  driver.connect();

  return Object.assign(options, {
    driver,
    lights
  });
}

(function main() {
  const {
    config: {
      lights
    },
    db
  } = global;

  const lightDb = getKey(db, 'lights');

  global.lights = lights.map((options) => {
    const {
      disable = false,
      name,
      type
    } = options;
    if (disable || !name || !type) return null;

    switch (type) {
      case 'SINGLE_RELAY':
        return createSwitchLight(options, lightDb);
      case 'LED_H801':
        return createLedLight(options, lightDb);
      default:
        return null;
    }
  }).filter(Boolean);
}());
