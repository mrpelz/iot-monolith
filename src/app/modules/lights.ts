import { ApplicationConfig, ApplicationState } from '../app.js';
import { H801, LedDriver, LedLight } from '../../lib/led/index.js';
import { HmiElement, HmiServer } from '../../lib/hmi/index.js';
import { Relay, RelayDriver, SonoffBasic } from '../../lib/relay/index.js';
import {
  coupleDoorSensorToLight,
  coupleDoorSensorToLightTimeout,
  coupleRfSwitchToLight,
  coupleRfSwitchToLightIncrease,
  coupleRfSwitchesToLightPermutations,
} from '../utils/lights.js';
import { setUpConnectionHmi, setUpLightTimerHmi } from '../utils/hmi.js';
import { DoorSensorState } from './door-sensors.js';
import { HttpServer } from '../../lib/http/server.js';
import { Prometheus } from '../../lib/prometheus/index.js';
import { Timer } from '../../lib/utils/time.js';
import { URL } from 'url';
import { get } from '../../lib/http/client.js';
import { parseString } from '../../lib/utils/string.js';
import { resolveAlways } from '../../lib/utils/oop.js';

type LightDriversConfig = ApplicationConfig['lights'];
type LightDriverConfig = LightDriversConfig[number];
type LightsConfig = LightDriverConfig['lights'];
type LightConfig = LightsConfig[number];

export type RelayState = LightConfig & {
  instance: Relay;
  timer?: Timer;
};

export type LedLightState = LightConfig & {
  instance: LedLight;
  timer?: Timer;
};

export type LightState = RelayState | LedLightState;

type RelayDriverState = LightDriverConfig & {
  instance: RelayDriver;
  lights: RelayState[];
};

type LedDriverState = LightDriverConfig & {
  instance: LedDriver;
  lights: LedLightState[];
};

type DriverState = RelayDriverState | LedDriverState;

type RelayPersistence = {
  [name: string]: {
    power: boolean;
  };
};

type LedLightPersistence = {
  [name: string]: {
    brightness: number;
  };
};

type LightsPersistence = RelayPersistence | LedLightPersistence;

export type State = {
  lightDrivers: DriverState[];
  lights: LightState[];
};

function addPersistenceHandler(
  name: string,
  instance: Relay | LedLight,
  lightDb: LightsPersistence
): void {
  const handleChange = () => {
    if (instance instanceof LedLight) {
      lightDb[name] = {
        brightness: instance.brightnessSetpoint,
      };
    } else {
      lightDb[name] = {
        power: instance.powerSetpoint,
      };
    }
  };

  if (instance instanceof LedLight) {
    const { brightness: value = 0 } =
      (lightDb as LedLightPersistence)[name] || {};
    instance.brightnessSetpoint = value;
  } else {
    const { power: value = false } = (lightDb as RelayPersistence)[name] || {};
    instance.powerSetpoint = value;
  }

  instance.on('set', handleChange);
  handleChange();
}

function createSonoffBasic(options: LightDriverConfig) {
  const { host, port } = options;

  try {
    return new SonoffBasic({
      host,
      port,
    });
  } catch (e) {
    return null;
  }
}

function createH801(options: LightDriverConfig) {
  const { host, port } = options;

  try {
    return new H801({
      host,
      port,
    });
  } catch (e) {
    return null;
  }
}

function createDmx(options: LightDriverConfig) {
  const { host, port, lights = [] } = options;

  try {
    return new LedDriver({
      channels: lights.length,
      host,
      port,
    });
  } catch (e) {
    return null;
  }
}

function createRelayLightInstance(options: LightConfig, driver: RelayDriver) {
  const { useChannel } = options;

  try {
    return new Relay({
      driver,
      useChannel,
    });
  } catch (e) {
    return null;
  }
}

function createLedLightInstance(options: LightConfig, driver: LedDriver) {
  const { duration, gamma, steps, useChannel } = options as typeof options &
    Record<string, unknown>;

  try {
    return new LedLight({
      driver,
      duration,
      gamma,
      steps,
      useChannel,
    });
  } catch (e) {
    return null;
  }
}

function createRelayLightSets(
  lightsOpts: LightsConfig,
  driver: RelayDriver,
  host: string,
  lightDb: RelayPersistence
) {
  // https://github.com/microsoft/TypeScript/issues/33591
  return (lightsOpts as typeof lightsOpts[number][])
    .map((lightOpts) => {
      const { name } = lightOpts;

      const instance = createRelayLightInstance(lightOpts, driver);
      if (!instance) return null;

      addPersistenceHandler(name, instance, lightDb);

      return {
        ...lightOpts,
        instance,
      };
    })
    .filter(Boolean) as RelayState[];
}

function createLedLightSets(
  lightsOpts: LightsConfig,
  driver: LedDriver,
  host: string,
  lightDb: LedLightPersistence
) {
  // https://github.com/microsoft/TypeScript/issues/33591
  return (lightsOpts as typeof lightsOpts[number][])
    .map((lightOpts) => {
      const { name } = lightOpts;

      const instance = createLedLightInstance(lightOpts, driver);
      if (!instance) return null;

      addPersistenceHandler(name, instance, lightDb);

      return {
        ...lightOpts,
        instance,
      };
    })
    .filter(Boolean) as LedLightState[];
}

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const { lights: driversConfig } = config;

  const { db } = data;

  const lightDb = db.get<LightsPersistence>('lights');

  const lights: LightState[] = [];

  const lightDrivers = driversConfig
    .map((options) => {
      const {
        disable: driverDisable = false,
        host,
        lights: lightsConfig = [],
        name: driverName,
        type,
      } = options as typeof options & Record<string, unknown>;

      if (driverDisable || !driverName || !type) return null;

      const lightsConfigFiltered = lightsConfig.filter((lightOpts) => {
        const { disable = false, name } = lightOpts as typeof lightOpts & {
          disable: boolean;
        };

        return name && !disable;
      });
      if (!lightsConfigFiltered.length) return null;

      let driver: RelayDriver | LedDriver | null;

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
          return null;
      }

      if (!driver) return null;

      let lightSets: LightState[] | undefined;

      switch (type) {
        case 'SONOFF_BASIC':
          lightSets = createRelayLightSets(
            lightsConfigFiltered,
            driver as RelayDriver,
            host,
            lightDb as RelayPersistence
          );
          break;
        case 'LED_H801':
        case 'LED_DMX':
          lightSets = createLedLightSets(
            lightsConfigFiltered,
            driver as LedDriver,
            host,
            lightDb as LedLightPersistence
          );
          break;
        default:
      }

      if (!lightSets || !lightSets.length) return null;

      lights.push(...lightSets);

      driver.connect();

      return {
        ...options,
        instance: driver,
        lights: lightSets,
      };
    })
    .filter(Boolean) as DriverState[];

  Object.defineProperty(data, 'lightDrivers', {
    value: lightDrivers,
  });

  Object.defineProperty(data, 'lights', {
    value: lights,
  });
}

function manageRelayLight(
  options: RelayDriverState,
  httpHookServer: HttpServer
) {
  const {
    instance: driver,
    lights,
    attributes: { driver: { enableButton = false } = {} } = {},
  } = options;

  driver.on('reliableConnect', () => {
    resolveAlways(driver.indicatorBlink(5, true));
  });

  // https://github.com/microsoft/TypeScript/issues/33591
  (lights as typeof lights[number][]).forEach((light, index) => {
    const {
      instance,
      name,
      attributes: { light: { timeout = 0, initialTimer = false } = {} } = {},
    } = light as typeof light & {
      attributes: {
        light: {
          timeout?: number;
          initialTimer?: boolean;
        };
      };
    };

    if (index === 0) {
      instance.on('change', () => {
        resolveAlways(
          instance.driver.indicatorBlink(instance.power ? 2 : 1, true)
        );
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
        timer,
      });
    }

    httpHookServer.route(`/${name}`, (request: any) => {
      const {
        urlQuery: { on },
      } = request;

      const handleResult = (result: any) => {
        return result ? 'on' : 'off';
      };

      if (on === undefined) {
        return {
          handler: instance.toggle().then(handleResult),
        };
      }

      return {
        handler: instance
          .setPower(Boolean(parseString(on) || false))
          .then(handleResult),
      };
    });
  });
}

function manageLedLight(options: LedDriverState, httpHookServer: HttpServer) {
  const { instance: driver, lights = [] } = options;

  driver.on('reliableConnect', () => {
    resolveAlways(driver.indicatorBlink(5, true));
  });

  // https://github.com/microsoft/TypeScript/issues/33591
  (lights as typeof lights[number][]).forEach((light) => {
    const {
      instance,
      name,
      attributes: { light: { timeout = 0, initialTimer = false } = {} } = {},
    } = light as typeof light & {
      attributes: {
        light: {
          timeout?: number;
          initialTimer?: boolean;
        };
      };
    };

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
        timer,
      });
    }

    httpHookServer.route(`/${name}`, (request: any) => {
      const {
        urlQuery: { on, br },
      } = request;

      const handleResult = (result: any) => {
        return result ? result.toString() : '0';
      };

      const brightness = Number.parseFloat(br);
      if (brightness <= 1 && brightness >= 0) {
        if (!Number.isNaN(brightness)) {
          return {
            handler: instance.setBrightness(brightness).then(handleResult),
          };
        }
      }

      if (on === undefined) {
        return {
          handler: instance.toggle().then(handleResult),
        };
      }

      return {
        handler: instance
          .setPower(Boolean(parseString(on) || false))
          .then(handleResult),
      };
    });
  });
}

function manageLights(lights: DriverState[], httpHookServer: HttpServer) {
  lights.forEach((options) => {
    const { instance } = options;

    if (instance instanceof RelayDriver) {
      manageRelayLight(options as RelayDriverState, httpHookServer);
    } else if (instance instanceof LedDriver) {
      manageLedLight(options as LedDriverState, httpHookServer);
    }
  });
}

function lightWithDoorSensor(
  lights: LightState[],
  doorSensors: DoorSensorState[]
) {
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

function lightWithRfSwitch(lights: LightState[], rfSwitches: any) {
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
    ['duschbadDeckenlampe', 'duschbadSpiegellampe', 'duschbadLampe'],
    [
      ['duschbadWallSink', 1],
      ['duschbadButtonShower', 4],
    ],
    [
      ['duschbadLampe'],
      ['duschbadSpiegellampe'],
      ['duschbadDeckenlampe', 'duschbadSpiegellampe', 'duschbadLampe'],
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
    'esszimmerKallaxLedWWhiteSide',
    'esszimmerButton2',
    4
  );
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
    'esszimmerKallaxLedWWhite',
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
      'kuecheLedRightWWhite',
    ],
    [['kuecheWallRight', 2]],
    [
      ['kuecheLedRightWWhite'],
      ['kuecheLedLeftWWhite'],
      ['kuecheLedLeftWWhite', 'kuecheLedRightWWhite'],
      [
        'kuecheLedLeftUp',
        'kuecheLedLeftWWhite',
        'kuecheLedRightUp',
        'kuecheLedRightWWhite',
      ],
      [
        'kuecheLedLeftUp',
        'kuecheLedLeftWhite',
        'kuecheLedLeftWWhite',
        'kuecheLedRightUp',
        'kuecheLedRightWhite',
        'kuecheLedRightWWhite',
      ],
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
      'schlafzimmerBedLedNightstandRight',
    ],
    [['schlafzimmerWallLeft', 1]],
    [
      ['schlafzimmerSteinlampe'],
      ['schlafzimmerBedLedRed'],
      ['schlafzimmerBedLedGreen'],
      ['schlafzimmerBedLedBlue'],
      [
        'schlafzimmerDeckenlampe',
        'schlafzimmerSteinlampe',
        'schlafzimmerBedLedRed',
        'schlafzimmerBedLedGreen',
        'schlafzimmerBedLedBlue',
        'schlafzimmerBedLedWhite',
        'schlafzimmerBedLedFloor',
        'schlafzimmerBedLedNightstandLeft',
        'schlafzimmerBedLedNightstandRight',
      ],
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
    ['wannenbadDeckenlampe', 'wannenbadLampe'],
    [['wannenbadWallSink', 1]],
    [['wannenbadLampe'], ['wannenbadDeckenlampe', 'wannenbadLampe']]
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
    'esszimmerKallaxLedWWhite',
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

function arbeitszimmerDeckenlampeWithHttpHook(lights: LightState[]) {
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

function relayLightToPrometheus(
  options: RelayDriverState,
  prometheus: Prometheus
) {
  const { lights = [], type } = options;

  // https://github.com/microsoft/TypeScript/issues/33591
  (lights as typeof lights[number][]).forEach((light) => {
    const { name, instance } = light;

    const { push } = prometheus.pushMetric('power', {
      name,
      subtype: type,
      type: 'light',
    });

    push(instance.power);

    instance.on('change', () => {
      push(instance.power);
    });
  });
}

function ledDriverLightToPrometheus(
  options: LedDriverState,
  prometheus: Prometheus
) {
  const { lights = [], type } = options;

  // https://github.com/microsoft/TypeScript/issues/33591
  (lights as typeof lights[number][]).forEach((light) => {
    const { name, instance } = light;

    const { push } = prometheus.pushMetric('power', {
      name,
      subtype: type,
      type: 'light',
    });

    push(instance.power);

    instance.on('change', () => {
      push(instance.power);
    });
  });
}

function lightsToPrometheus(lights: DriverState[], prometheus: Prometheus) {
  lights.forEach((light) => {
    const { type } = light;

    switch (type) {
      case 'SONOFF_BASIC':
        relayLightToPrometheus(light as RelayDriverState, prometheus);
        break;
      case 'LED_H801':
      case 'LED_DMX':
        ledDriverLightToPrometheus(light as LedDriverState, prometheus);
        break;
      default:
    }
  });
}

function relayLightHmi(options: RelayDriverState, hmiServer: HmiServer) {
  const { lights = [] } = options;

  setUpConnectionHmi(options, 'relay light', hmiServer);

  // https://github.com/microsoft/TypeScript/issues/33591
  (lights as typeof lights[number][]).forEach((light) => {
    const {
      name,
      instance,
      timer,
      attributes: { hmi: hmiDefaults = null } = {},
    } = light;

    if (!hmiDefaults) return;

    const hmiAttributes = Object.assign(
      {
        category: 'lamps',
        groupLabel: hmiDefaults.group,
        setType: 'trigger',
        type: 'binary-light',
      },
      hmiDefaults
    );

    const hmiTimer = setUpLightTimerHmi(timer, name, hmiAttributes, hmiServer);

    const hmi = new HmiElement({
      attributes: Object.assign(
        {
          subGroup: 'power',
        },
        hmiAttributes
      ),
      getter: () => {
        return Promise.resolve(instance.power ? 'on' : 'off');
      },
      name,
      server: hmiServer,
      settable: true,
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

function ledDriverLightHmi(options: LedDriverState, hmiServer: HmiServer) {
  const { lights = [] } = options;

  setUpConnectionHmi(options, 'led light', hmiServer);

  // https://github.com/microsoft/TypeScript/issues/33591
  (lights as typeof lights[number][]).forEach((light) => {
    const {
      name,
      instance,
      timer,
      attributes: { hmi: hmiDefaults = null } = {},
    } = light;

    if (!hmiDefaults) return;

    const hmiAttributes = Object.assign(
      {
        category: 'lamps',
        group: 'led',
        groupLabel: 'led',
        sortGroup: '_bottom',
        type: 'led',
      },
      hmiDefaults
    );

    const hmiTimer = setUpLightTimerHmi(timer, name, hmiAttributes, hmiServer);

    const hmiValue = new HmiElement({
      attributes: Object.assign(
        {
          setType: 'trigger',
          subType: 'read',
          unit: 'percent',
        },
        hmiAttributes
      ),
      getter: () => {
        return Promise.resolve(instance.brightnessPercentage);
      },
      name: `${name}Value`,
      server: hmiServer,
      settable: true,
    });

    const hmiUp = new HmiElement({
      attributes: Object.assign(
        {
          label: 'increase',
          setType: 'trigger',
          subType: 'increase',
        },
        hmiAttributes
      ),
      name: `${name}Up`,
      server: hmiServer,
      settable: true,
    });

    const hmiDown = new HmiElement({
      attributes: Object.assign(
        {
          label: 'decrease',
          setType: 'trigger',
          subType: 'decrease',
        },
        hmiAttributes
      ),
      name: `${name}Down`,
      server: hmiServer,
      settable: true,
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

function lightsHmi(drivers: DriverState[], hmiServer: HmiServer) {
  drivers.forEach((driver) => {
    const { type } = driver;

    switch (type) {
      case 'SONOFF_BASIC':
        relayLightHmi(driver as RelayDriverState, hmiServer);
        break;
      case 'LED_H801':
      case 'LED_DMX':
        ledDriverLightHmi(driver as LedDriverState, hmiServer);
        break;
      default:
    }
  });
}

export function manage(_: ApplicationConfig, data: ApplicationState): void {
  const {
    doorSensors,
    hmiServer,
    httpHookServer,
    lightDrivers,
    lights,
    prometheus,
    rfSwitches,
  } = data;

  manageLights(lightDrivers, httpHookServer);
  lightsToPrometheus(lightDrivers, prometheus);
  lightsHmi(lightDrivers, hmiServer);

  lightWithRfSwitch(lights, rfSwitches);
  lightWithDoorSensor(lights, doorSensors);
  arbeitszimmerDeckenlampeWithHttpHook(lights);
}
