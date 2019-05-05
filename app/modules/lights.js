const { URL } = require('url');

const { H801, LedLight } = require('../../libs/led');
const { HmiElement } = require('../../libs/hmi');
const { SingleRelay } = require('../../libs/single-relay');
const { get } = require('../../libs/http/client');
const { resolveAlways } = require('../../libs/utils/oop');
const { camel, parseString } = require('../../libs/utils/string');
const { getKey } = require('../../libs/utils/structures');
const { Timer } = require('../../libs/utils/time');

const {
  coupleDoorSensorToLight,
  coupleDoorSensorToLightTimeout,
  coupleRfSwitchToLight,
  coupleRfToggleToLight
} = require('../utils/lights');

const { setUpConnectionHmi } = require('../utils/hmi');


function addPersistenceHandler(name, instance, lightDb, dbKey, instanceKey) {
  const handleChange = () => {
    lightDb[name] = {
      [dbKey]: instance[instanceKey]
    };
  };

  const {
    [dbKey]: value = false
  } = lightDb[name] || {};

  instance[instanceKey] = value;

  instance.on('set', handleChange);
  handleChange();
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

    instance.log.friendlyName(`${name} (HOST: ${host})`);

    return Object.assign(lightOpts, {
      instance
    });
  }).filter(Boolean);

  driver.connect();

  return Object.assign(options, {
    instance: driver,
    lights
  });
}

function create(config, data) {
  const {
    lights: lightsConfig
  } = config;

  const {
    db
  } = data;

  const lightDb = getKey(db, 'lights');

  const lights = lightsConfig.map((options) => {
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

  Object.assign(data, {
    lights
  });
}


function manageSingleRelayLight(light, httpHookServer) {
  const {
    instance,
    name,
    attributes: {
      light: {
        enableButton = false,
        timeout = 0
      } = {}
    } = {}
  } = light;

  instance.on('reliableConnect', () => {
    resolveAlways(instance.ledBlink(5, true));
  });

  if (enableButton) {
    instance.on('buttonShortpress', () => {
      resolveAlways(instance.toggle());
    });
  }

  if (timeout) {
    const timer = new Timer(timeout);

    timer.on('hit', () => {
      resolveAlways(instance.setPower(false));
    });

    instance.on('set', () => {
      timer.start();
    });

    instance.on('change', () => {
      if (instance.power) return;
      timer.stop();
    });

    Object.assign(light, {
      timer
    });
  }

  httpHookServer.route(`/${name}`, (request) => {
    const {
      urlQuery: { on }
    } = request;

    const handleResult = (result) => {
      return result ? 'on' : 'off';
    };

    if (on === undefined) {
      return {
        handler: instance.toggle().then(handleResult)
      };
    }

    return {
      handler: instance.setPower(Boolean(parseString(on) || false)).then(handleResult)
    };
  });

  instance.on('change', () => {
    resolveAlways(instance.ledBlink(instance.power ? 2 : 1, true));
  });
}

function manageLedLight(options, httpHookServer) {
  const { instance: driver, lights = [] } = options;

  driver.on('reliableConnect', () => {
    resolveAlways(driver.indicatorBlink(5, true));
  });

  lights.forEach((light) => {
    const {
      instance,
      name,
      attributes: {
        light: {
          timeout = 0
        } = {}
      } = {}
    } = light;

    if (timeout) {
      const timer = new Timer(timeout);

      timer.on('hit', () => {
        resolveAlways(instance.setPower(false));
      });

      instance.on('set', () => {
        timer.start();
      });

      instance.on('change', () => {
        if (instance.power) return;
        timer.stop();
      });

      Object.assign(light, {
        timer
      });
    }

    httpHookServer.route(`/${name}`, (request) => {
      const {
        urlQuery: { on, br }
      } = request;

      const handleResult = (result) => {
        return result ? result.toString() : '0';
      };

      const brightness = Number.parseFloat(br);
      if (!Number.isNaN(brightness)) {
        return {
          handler: instance.setBrightness(brightness).then(handleResult)
        };
      }

      if (on === undefined) {
        return {
          handler: instance.toggle().then(handleResult)
        };
      }

      return {
        handler: instance.setPower(Boolean(parseString(on) || false)).then(handleResult)
      };
    });
  });
}

function manageLights(lights, httpHookServer) {
  lights.forEach((options) => {
    const { type } = options;

    switch (type) {
      case 'SINGLE_RELAY':
        manageSingleRelayLight(options, httpHookServer);
        break;
      case 'LED_H801':
        manageLedLight(options, httpHookServer);
        break;
      default:
    }
  });
}

function lightWithDoorSensor(lights, doorSensors) {
  coupleDoorSensorToLight(
    lights,
    doorSensors,
    'abstellraumDeckenlampe',
    'abstellraumDoor'
  );

  coupleDoorSensorToLight(
    lights,
    doorSensors,
    'duschbadDeckenlampe',
    'duschbadDoor'
  );

  coupleDoorSensorToLight(
    lights,
    doorSensors,
    'wannenbadDeckenlampe',
    'wannenbadDoor'
  );

  coupleDoorSensorToLightTimeout(
    lights,
    doorSensors,
    'flurDeckenlampeFront',
    'entryDoor',
    60000
  );
}

function lightWithRfSwitch(lights, rfSwitches, rfSwitchLongPressTimeout) {
  //  ABSTELLRAUM
  //    wall switches
  coupleRfToggleToLight(
    lights,
    rfSwitches,
    'abstellraumDeckenlampe',
    'abstellraumWall',
    1,
    rfSwitchLongPressTimeout
  );


  //  ARBEITSZIMMER
  //    wall switches
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'arbeitszimmerDeckenlampe',
    'arbeitszimmerWall',
    1
  );


  //  DUSCHBAD
  //    wall switches
  coupleRfToggleToLight(
    lights,
    rfSwitches,
    'duschbadDeckenlampe',
    'duschbadWallDoor',
    1,
    rfSwitchLongPressTimeout
  );
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'duschbadSpiegellampe',
    'duschbadWallSink',
    1
  );


  //  ESSZIMMER
  //    wall switches
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerDeckenlampe',
    'esszimmerWallFront',
    1
  );
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerDeckenlampe',
    'esszimmerWallFront',
    2
  );

  //    buttons
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerDeckenlampe',
    'esszimmerMulti1',
    1
  );
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerStehlampe',
    'esszimmerMulti1',
    2
  );
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerFloodlight',
    'esszimmerMulti1',
    3
  );


  //  KUECHE
  //    wall switches
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerDeckenlampe',
    'kuecheWallRight',
    2
  );


  //  SCHLAFZIMMER
  //    wall switches
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'schlafzimmerDeckenlampe',
    'schlafzimmerWallLeft',
    1
  );
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'schlafzimmerDeckenlampe',
    'schlafzimmerWallRight',
    1
  );

  //    buttons
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'schlafzimmerSteinlampe',
    'schlafzimmerButton1',
    4
  );
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'schlafzimmerSteinlampe',
    'schlafzimmerButton2',
    4
  );


  //  WANNENBAD
  //    wall switches
  coupleRfToggleToLight(
    lights,
    rfSwitches,
    'wannenbadDeckenlampe',
    'wannenbadWallDoor',
    1,
    rfSwitchLongPressTimeout
  );


  // WOHNZIMMER
  //    wall switches
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerDeckenlampe',
    'wohnzimmerWallBack',
    1
  );
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerStehlampe',
    'wohnzimmerWallBack',
    2
  );
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerDeckenlampe',
    'wohnzimmerWallBack',
    3
  );

  // buttons
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerDeckenlampe',
    'wohnzimmerMulti1',
    1
  );
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerStehlampe',
    'wohnzimmerMulti1',
    2
  );
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerFloodlight',
    'wohnzimmerMulti1',
    3
  );
}

function arbeitszimmerDeckenlampeWithHttpHook(lights) {
  const name = 'arbeitszimmerDeckenlampe';
  const lightMatch = lights.find(({ name: n }) => {
    return n === name;
  });

  if (!lightMatch) {
    throw new Error('could not find light');
  }

  const { instance } = lightMatch;
  const url = new URL('https://hermes.net.wurstsalat.cloud/phonebutton.php');
  url.searchParams.append('change', '1');
  url.searchParams.append('symbn', name);

  instance.on('change', () => {
    url.searchParams.append('state', instance.power ? '1' : '0');
    resolveAlways(get(url));
  });
}

function singleRelayLightToPrometheus(light, prometheus) {
  const { name, instance, type } = light;

  const { push } = prometheus.pushMetric(
    'power',
    {
      name,
      type: 'light',
      subtype: type
    }
  );

  push(instance.power);

  instance.on('change', () => {
    push(instance.power);
  });
}

function ledDriverLightToPrometheus(options, prometheus) {
  const { lights = [], type } = options;

  lights.forEach((light) => {
    const { name, instance } = light;

    const { push } = prometheus.pushMetric(
      'power',
      {
        name,
        type: 'light',
        subtype: type
      }
    );

    push(instance.power);

    instance.on('change', () => {
      push(instance.power);
    });
  });
}

function lightsToPrometheus(lights, prometheus) {
  lights.forEach((light) => {
    const { type } = light;

    switch (type) {
      case 'SINGLE_RELAY':
        singleRelayLightToPrometheus(light, prometheus);
        break;
      case 'LED_H801':
        ledDriverLightToPrometheus(light, prometheus);
        break;
      default:
    }
  });
}

function lightTimerHmi(timer, name, attributes, hmiServer) {
  if (!timer) return null;

  const hmiTimer = new HmiElement({
    name: camel(name, 'timer'),
    attributes: Object.assign({}, attributes, {
      group: camel(attributes.group, 'timer'),
      subGroup: 'timer'
    }),
    server: hmiServer,
    getter: () => {
      return Promise.resolve(timer.isRunning ? 'on' : 'off');
    },
    settable: true
  });

  hmiTimer.on('set', () => {
    if (timer.isRunning) {
      timer.stop();
    } else {
      timer.start();
    }

    hmiTimer.update();
  });

  return hmiTimer;
}

function singleRelayLightHmi(light, hmiServer) {
  const {
    name,
    instance,
    timer,
    attributes: {
      hmi: hmiDefaults
    } = {}
  } = light;

  setUpConnectionHmi(light, 'single-relay light', hmiServer);

  if (!hmiDefaults) return;

  const hmiAttributes = Object.assign({
    category: 'lamps',
    groupLabel: hmiDefaults.group,
    setType: 'trigger',
    type: 'binary-light'
  }, hmiDefaults);

  const hmiTimer = lightTimerHmi(timer, name, hmiAttributes, hmiServer);

  const hmi = new HmiElement({
    name,
    attributes: Object.assign({
      subGroup: 'trigger'
    }, hmiAttributes),
    server: hmiServer,
    getter: () => {
      return Promise.resolve(instance.power ? 'on' : 'off');
    },
    settable: true
  });

  instance.on('change', () => {
    hmi.update();

    if (hmiTimer) {
      hmiTimer.update();
    }
  });

  hmi.on('set', () => {
    resolveAlways(instance.toggle());
  });
}

function ledDriverLightHmi(options, hmiServer) {
  const { lights = [] } = options;

  setUpConnectionHmi(options, 'led light', hmiServer);

  lights.forEach((light) => {
    const {
      name,
      instance,
      timer,
      attributes: {
        hmi: hmiDefaults
      } = {}
    } = light;

    if (!hmiDefaults) return;

    const hmiAttributes = Object.assign({
      category: 'lamps',
      group: 'led',
      groupLabel: 'led',
      sortGroup: '_bottom',
      type: 'led'
    }, hmiDefaults);

    const hmiTimer = lightTimerHmi(timer, name, hmiAttributes, hmiServer);

    const hmiValue = new HmiElement({
      name: `${name}Value`,
      attributes: Object.assign({
        subType: 'read',
        unit: 'percent'
      }, hmiAttributes),
      server: hmiServer,
      getter: () => {
        return Promise.resolve(
          instance.brightnessPercentage
        );
      }
    });

    const hmiUp = new HmiElement({
      name: `${name}Up`,
      attributes: Object.assign({
        label: 'increase',
        setType: 'trigger',
        subType: 'increase'
      }, hmiAttributes),
      server: hmiServer,
      settable: true
    });

    const hmiDown = new HmiElement({
      name: `${name}Down`,
      attributes: Object.assign({
        label: 'decrease',
        setType: 'trigger',
        subType: 'decrease'
      }, hmiAttributes),
      server: hmiServer,
      settable: true
    });

    instance.on('change', () => {
      hmiValue.update();

      if (hmiTimer) {
        hmiTimer.update();
      }
    });

    hmiUp.on('set', () => {
      resolveAlways(instance.increase(true));
    });

    hmiDown.on('set', () => {
      resolveAlways(instance.increase(false));
    });
  });
}

function lightsHmi(lights, hmiServer) {
  lights.forEach((light) => {
    const { type } = light;

    switch (type) {
      case 'SINGLE_RELAY':
        singleRelayLightHmi(light, hmiServer);
        break;
      case 'LED_H801':
        ledDriverLightHmi(light, hmiServer);
        break;
      default:
    }
  });
}

function manage(config, data) {
  const {
    globals: {
      rfSwitchLongPressTimeout
    }
  } = config;

  const {
    doorSensors,
    hmiServer,
    httpHookServer,
    lights,
    prometheus,
    rfSwitches
  } = data;

  manageLights(lights, httpHookServer);
  lightWithDoorSensor(lights, doorSensors);
  lightWithRfSwitch(lights, rfSwitches, rfSwitchLongPressTimeout);
  arbeitszimmerDeckenlampeWithHttpHook(lights);
  lightsToPrometheus(lights, prometheus);
  lightsHmi(lights, hmiServer);
}


module.exports = {
  create,
  manage
};
