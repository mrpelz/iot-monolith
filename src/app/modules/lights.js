import { H801, LedDriver, LedLight } from '../../lib/led/index.js';
import { Relay, SonoffBasic } from '../../lib/relay/index.js';
import {
  coupleDoorSensorToLight,
  coupleDoorSensorToLightTimeout,
  coupleRfSwitchToLight,
  coupleRfSwitchToLightIncrease,
  coupleRfSwitchesToLightPermutations
} from '../utils/lights.js';
import { setUpConnectionHmi, setUpLightTimerHmi } from '../utils/hmi.js';
import { HmiElement } from '../../lib/hmi/index.js';
import { Timer } from '../../lib/utils/time.js';
import { URL } from 'url';
import { get } from '../../lib/http/client.js';
import { getKey } from '../../lib/utils/structures.js';
import { parseString } from '../../lib/utils/string.js';
import { resolveAlways } from '../../lib/utils/oop.js';


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

function createSonoffBasic(options) {
  const {
    host,
    port
  } = options;

  try {
    return new SonoffBasic({
      host,
      port
    });
  } catch (e) {
    return null;
  }
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

function createDmx(options) {
  const {
    host,
    port,
    lights = []
  } = options;

  try {
    return new LedDriver({
      host,
      port,
      channels: lights.length
    });
  } catch (e) {
    return null;
  }
}

function createRelayLightInstance(options, driver) {
  const {
    useChannel
  } = options;

  try {
    return new Relay({
      driver,
      useChannel
    });
  } catch (e) {
    return null;
  }
}

function createLedLightInstance(options, driver) {
  const {
    duration,
    gamma,
    steps,
    useChannel
  } = options;

  try {
    return new LedLight({
      driver,
      duration,
      gamma,
      steps,
      useChannel
    });
  } catch (e) {
    return null;
  }
}

function createRelayLightSets(lightsOpts, driver, host, lightDb) {
  return lightsOpts.map((lightOpts) => {
    const { name } = lightOpts;

    const instance = createRelayLightInstance(lightOpts, driver);
    if (!instance) return null;

    addPersistenceHandler(name, instance, lightDb, 'power', 'powerSetpoint');

    instance.log.friendlyName(`${name} (HOST: ${host})`);

    return Object.assign(lightOpts, {
      instance
    });
  }).filter(Boolean);
}

function createLedLightSets(lightsOpts, driver, host, lightDb) {
  return lightsOpts.map((lightOpts) => {
    const { name } = lightOpts;

    const instance = createLedLightInstance(lightOpts, driver);
    if (!instance) return null;

    addPersistenceHandler(name, instance, lightDb, 'brightness', 'brightnessSetpoint');

    instance.log.friendlyName(`${name} (HOST: ${host})`);

    return Object.assign(lightOpts, {
      instance
    });
  }).filter(Boolean);
}

export function create(config, data) {
  const {
    lights: driversConfig
  } = config;

  const {
    db
  } = data;

  const lightDb = getKey(db, 'lights');

  const lights = [];

  const lightDrivers = driversConfig.map((options) => {
    const {
      disable: driverDisable = false,
      host,
      lights: lightsConfig = [],
      name: driverName,
      type
    } = options;

    if (driverDisable || !driverName || !type) return null;

    const lightsConfigFiltered = lightsConfig.filter(({ disable = false, name }) => {
      return name && !disable;
    });
    if (!lightsConfigFiltered.length) return null;

    let driver;

    switch (type) {
      case 'SONOFF_BASIC':
        driver = createSonoffBasic(options);
        break;
      case 'LED_H801':
        driver = createH801(options);
        break;
      case 'LED_DMX':
        driver = createDmx(options);
        break;
      default:
    }

    if (!driver) return null;

    driver.log.friendlyName(`${driverName} (HOST: ${host})`);

    let lightSets;

    switch (type) {
      case 'SONOFF_BASIC':
        lightSets = createRelayLightSets(lightsConfigFiltered, driver, host, lightDb);
        break;
      case 'LED_H801':
      case 'LED_DMX':
        lightSets = createLedLightSets(lightsConfigFiltered, driver, host, lightDb);
        break;
      default:
    }

    if (!lightSets || !lightSets.length) return null;

    lights.push(...lightSets);

    driver.connect();

    return Object.assign(options, {
      instance: driver,
      lights: lightSets
    });
  }).filter(Boolean);

  Object.assign(data, {
    lightDrivers,
    lights
  });
}

function manageRelayLight(options, httpHookServer) {
  const {
    instance: driver,
    lights = [],
    attributes: {
      driver: {
        enableButton = false
      } = {}
    } = {}
  } = options;

  driver.on('reliableConnect', () => {
    resolveAlways(driver.indicatorBlink(5, true));
  });

  lights.forEach((light, index) => {
    const {
      instance,
      name,
      attributes: {
        light: {
          timeout = 0,
          initialTimer = false
        } = {}
      } = {}
    } = light;

    if (index === 0) {
      instance.on('change', () => {
        resolveAlways(instance.driver.indicatorBlink(instance.power ? 2 : 1, true));
      });

      if (enableButton) {
        instance.driver.on('button0Shortpress', () => {
          resolveAlways(instance.toggle());
        });
      }
    }

    if (timeout) {
      const timer = new Timer(timeout);

      timer.on('hit', () => {
        resolveAlways(instance.setPower(false));
      });

      instance.on('set', () => {
        if (!timer.isRunning || !instance.power) return;
        timer.start();
      });

      instance.on('change', () => {
        if (instance.power && initialTimer) {
          timer.start();
          return;
        }

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
          timeout = 0,
          initialTimer = false
        } = {}
      } = {}
    } = light;

    if (timeout) {
      const timer = new Timer(timeout);

      timer.on('hit', () => {
        resolveAlways(instance.setPower(false));
      });

      instance.on('set', () => {
        if (!timer.isRunning || !instance.power) return;
        timer.start();
      });

      instance.on('change', () => {
        if (instance.power && initialTimer) {
          timer.start();
          return;
        }

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
      if (brightness <= 1 && brightness >= 0) {
        if (!Number.isNaN(brightness)) {
          return {
            handler: instance.setBrightness(brightness).then(handleResult)
          };
        }
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
      case 'SONOFF_BASIC':
        manageRelayLight(options, httpHookServer);
        break;
      case 'LED_H801':
      case 'LED_DMX':
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

  coupleDoorSensorToLightTimeout(
    lights,
    doorSensors,
    'flurDeckenlampeFront',
    'entryDoor',
    60000
  );
}

function lightWithRfSwitch(lights, rfSwitches) {
  //  ABSTELLRAUM
  //    wall switches
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'abstellraumDeckenlampe',
    'abstellraumWall',
    1
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
  //    permutations
  coupleRfSwitchesToLightPermutations(
    lights,
    rfSwitches,
    [
      'duschbadDeckenlampe',
      'duschbadSpiegellampe',
      'duschbadLampe'
    ],
    [
      ['duschbadWallSink', 1],
      ['duschbadButtonShower', 4]
    ],
    [
      [
        'duschbadLampe'
      ],
      [
        'duschbadSpiegellampe'
      ],
      [
        'duschbadDeckenlampe'
      ],
      [
        'duschbadDeckenlampe',
        'duschbadSpiegellampe',
        'duschbadLampe'
      ]
    ]
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
    'wohnzimmerKallaxLedWWhite',
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
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerStehlampe',
    'esszimmerMulti1',
    4
  );


  //  KUECHE
  //    permutations
  coupleRfSwitchesToLightPermutations(
    lights,
    rfSwitches,
    [
      'kuecheLedLeftUp',
      'kuecheLedLeftWhite',
      'kuecheLedLeftWWhite',
      'kuecheLedRightUp',
      'kuecheLedRightWhite',
      'kuecheLedRightWWhite'
    ],
    [
      ['kuecheWallRight', 2]
    ],
    [
      [
        'kuecheLedLeftWWhite'
      ],
      [
        'kuecheLedLeftWWhite',
        'kuecheLedRightWWhite'
      ],
      [
        'kuecheLedLeftUp',
        'kuecheLedLeftWWhite',
        'kuecheLedRightUp',
        'kuecheLedRightWWhite'
      ],
      [
        'kuecheLedLeftUp',
        'kuecheLedLeftWhite',
        'kuecheLedLeftWWhite',
        'kuecheLedRightUp',
        'kuecheLedRightWhite',
        'kuecheLedRightWWhite'
      ]
    ]
  );


  //  SCHLAFZIMMER
  //    wall switches
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'schlafzimmerDeckenlampe',
    'schlafzimmerWallRight',
    1
  );

  //    permutations
  coupleRfSwitchesToLightPermutations(
    lights,
    rfSwitches,
    [
      'schlafzimmerDeckenlampe',
      'schlafzimmerSteinlampe',
      'schlafzimmerBedLedRed',
      'schlafzimmerBedLedGreen',
      'schlafzimmerBedLedBlue',
      'schlafzimmerBedLedWhite',
      'schlafzimmerBedLedFloor',
      'schlafzimmerBedLedNightstandLeft',
      'schlafzimmerBedLedNightstandRight'
    ],
    [
      ['schlafzimmerWallLeft', 1]
    ],
    [
      [
        'schlafzimmerSteinlampe'
      ],
      [
        'schlafzimmerBedLedRed'
      ],
      [
        'schlafzimmerBedLedGreen'
      ],
      [
        'schlafzimmerBedLedBlue'
      ],
      [
        'schlafzimmerBedLedNightstandLeft',
        'schlafzimmerBedLedNightstandRight'
      ],
      [
        'schlafzimmerDeckenlampe'
      ],
      [
        'schlafzimmerDeckenlampe',
        'schlafzimmerSteinlampe',
        'schlafzimmerBedLedRed',
        'schlafzimmerBedLedGreen',
        'schlafzimmerBedLedBlue',
        'schlafzimmerBedLedWhite',
        'schlafzimmerBedLedFloor',
        'schlafzimmerBedLedNightstandLeft',
        'schlafzimmerBedLedNightstandRight'
      ]
    ]
  );

  //    buttons
  coupleRfSwitchToLightIncrease(
    lights,
    rfSwitches,
    'schlafzimmerBedLedNightstandLeft',
    'schlafzimmerButton1',
    1
  );
  coupleRfSwitchToLightIncrease(
    lights,
    rfSwitches,
    'schlafzimmerBedLedNightstandRight',
    'schlafzimmerButton1',
    2
  );
  coupleRfSwitchToLightIncrease(
    lights,
    rfSwitches,
    'schlafzimmerBedLedWhite',
    'schlafzimmerButton1',
    3
  );
  coupleRfSwitchToLightIncrease(
    lights,
    rfSwitches,
    'schlafzimmerBedLedFloor',
    'schlafzimmerButton1',
    4
  );
  coupleRfSwitchToLightIncrease(
    lights,
    rfSwitches,
    'schlafzimmerBedLedNightstandLeft',
    'schlafzimmerButton2',
    1
  );
  coupleRfSwitchToLightIncrease(
    lights,
    rfSwitches,
    'schlafzimmerBedLedNightstandRight',
    'schlafzimmerButton2',
    2
  );
  coupleRfSwitchToLightIncrease(
    lights,
    rfSwitches,
    'schlafzimmerBedLedWhite',
    'schlafzimmerButton2',
    3
  );
  coupleRfSwitchToLightIncrease(
    lights,
    rfSwitches,
    'schlafzimmerBedLedFloor',
    'schlafzimmerButton2',
    4
  );


  //  WANNENBAD
  //    permutations
  coupleRfSwitchesToLightPermutations(
    lights,
    rfSwitches,
    [
      'wannenbadDeckenlampe',
      'wannenbadLampe'
    ],
    [
      ['wannenbadWallSink', 1]
    ],
    [
      [
        'wannenbadLampe'
      ],
      [
        'wannenbadDeckenlampe'
      ],
      [
        'wannenbadDeckenlampe',
        'wannenbadLampe'
      ]
    ]
  );


  //  WOHNZIMMER
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
    'esszimmerFloodlight',
    'wohnzimmerMulti1',
    2
  );
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerKallaxLedWWhite',
    'wohnzimmerMulti1',
    3
  );
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerStehlampe',
    'wohnzimmerMulti1',
    4
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
  url.searchParams.set('change', '1');
  url.searchParams.set('symbn', name);

  instance.on('change', () => {
    url.searchParams.set('state', instance.power ? '1' : '0');
    resolveAlways(get(url));
  });
}

function relayLightToPrometheus(options, prometheus) {
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
      case 'SONOFF_BASIC':
        relayLightToPrometheus(light, prometheus);
        break;
      case 'LED_H801':
      case 'LED_DMX':
        ledDriverLightToPrometheus(light, prometheus);
        break;
      default:
    }
  });
}

function relayLightHmi(options, hmiServer) {
  const { lights = [] } = options;

  setUpConnectionHmi(options, 'relay light', hmiServer);

  lights.forEach((light) => {
    const {
      name,
      instance,
      timer,
      attributes: {
        hmi: hmiDefaults = null
      } = {}
    } = light;

    if (!hmiDefaults) return;

    const hmiAttributes = Object.assign({
      category: 'lamps',
      groupLabel: hmiDefaults.group,
      setType: 'trigger',
      type: 'binary-light'
    }, hmiDefaults);

    const hmiTimer = setUpLightTimerHmi(timer, name, hmiAttributes, hmiServer);

    const hmi = new HmiElement({
      name,
      attributes: Object.assign({
        subGroup: 'power'
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
        hmi: hmiDefaults = null
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

    const hmiTimer = setUpLightTimerHmi(timer, name, hmiAttributes, hmiServer);

    const hmiValue = new HmiElement({
      name: `${name}Value`,
      attributes: Object.assign({
        setType: 'trigger',
        subType: 'read',
        unit: 'percent'
      }, hmiAttributes),
      server: hmiServer,
      settable: true,
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

    hmiValue.on('set', () => {
      resolveAlways(instance.toggle());
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
      case 'SONOFF_BASIC':
        relayLightHmi(light, hmiServer);
        break;
      case 'LED_H801':
      case 'LED_DMX':
        ledDriverLightHmi(light, hmiServer);
        break;
      default:
    }
  });
}

export function manage(_, data) {
  const {
    doorSensors,
    hmiServer,
    httpHookServer,
    lightDrivers,
    lights,
    prometheus,
    rfSwitches
  } = data;

  manageLights(lightDrivers, httpHookServer);
  lightsToPrometheus(lightDrivers, prometheus);
  lightsHmi(lightDrivers, hmiServer);

  lightWithRfSwitch(lights, rfSwitches);
  lightWithDoorSensor(lights, doorSensors);
  arbeitszimmerDeckenlampeWithHttpHook(lights);
}
