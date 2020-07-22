import { ApplicationConfig, ApplicationState } from '../app.js';
import { HmiElement, HmiServer } from '../../lib/hmi/index.js';
import {
  coupleDoorSensorToLight,
  coupleRfSwitchToLight,
} from '../utils/lights.js';
import { DoorSensorState } from './door-sensors.js';
import { HttpServer } from '../../lib/http/server.js';
import { LedLight } from '../../lib/led/index.js';
import { LightGroup } from '../../lib/group/index.js';
import { LightState } from './lights.js';
import { MetricAggregate } from './metric-aggregates.js';
import { Relay } from '../../lib/relay/index.js';
import { Timer } from '../../lib/utils/time.js';
import { Type } from '../../lib/aggregate/index.js';
import { parseString } from '../../lib/utils/string.js';
import { resolveAlways } from '../../lib/utils/oop.js';
import { setUpLightTimerHmi } from '../utils/hmi.js';

type LightGroupsConfig = ApplicationConfig['lightGroups'];
type LightGroupConfig = LightGroupsConfig[number];

export type LightGroupState = LightGroupConfig & {
  instance: LightGroup;
};

type LightGroupIntercepts = {
  [name: string]: (number | null)[][];
};

export type State = {
  allLightsGroup: LightGroup;
  lightGroups: LightGroupState[];
};

function createLightGroup(group: LightGroupConfig, lights: LightState[]) {
  const {
    attributes: { light: { allOf = false } = {} } = {},
    lights: includedLights,
  } = group;

  const instances = lights
    .filter(({ name }) => {
      return includedLights.includes(name);
    })
    .map(({ instance }) => {
      return instance;
    });

  try {
    return new LightGroup(instances, allOf);
  } catch (e) {
    return null;
  }
}

function createLightGroups(
  lightGroups: LightGroupsConfig,
  lights: LightState[]
) {
  return lightGroups
    .map((group) => {
      const { disable = false, name } = group as typeof group & {
        disable: boolean;
      };
      if (disable || !name) return null;

      const instance = createLightGroup(group, lights);

      if (!instance) return null;

      return {
        ...group,
        instance,
      };
    })
    .filter(Boolean) as LightGroupState[];
}

function createAllLightsGroup(lights: LightState[]) {
  const instances = lights.map(({ instance }) => {
    return instance;
  });

  try {
    return new LightGroup(instances);
  } catch (e) {
    return null;
  }
}

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const { lightGroups: lightGroupsConfig } = config;

  const { lights } = data;

  Object.defineProperty(data, 'allLightsGroup', {
    value: createAllLightsGroup(lights),
  });

  Object.defineProperty(data, 'lightGroups', {
    value: createLightGroups(lightGroupsConfig, lights),
  });
}

function manageLightGroup(
  group: LightGroupState,
  httpHookServer: HttpServer,
  lightGroupIntercepts: LightGroupIntercepts,
  metricAggregates: MetricAggregate[]
) {
  const {
    instance,
    name,
    attributes: { light: { timeout = 0, initialTimer = false } = {} } = {},
  } = group as typeof group & {
    attributes: {
      light: {
        timeout?: number;
        initialTimer?: boolean;
      };
    };
  };

  if (Object.keys(lightGroupIntercepts).includes(name)) {
    const { [name]: intercept } = lightGroupIntercepts;
    const globalMeanAggregateSensor = metricAggregates.find(
      ({ group: aggregateGroup, metric, type }) => {
        return (
          aggregateGroup === 'global' &&
          metric === 'brightness' &&
          type === Type.Median
        );
      }
    );

    if (globalMeanAggregateSensor) {
      instance.setInterceptor(
        (on: boolean, instances: (Relay | LedLight)[]) => {
          if (!on) {
            return instances.map((light) => {
              return light.setPower(false);
            });
          }

          const brightness = globalMeanAggregateSensor.instance.getState();

          return instances.map((light, index) => {
            const [from = null, to = null] = intercept[index] || [];

            if (brightness === null || from === null || to === null) {
              return light.setPower(false);
            }

            if (from === null && to === null) return light.setPower(true);
            if (brightness >= from && to === null) return light.setPower(true);
            if (from === null && brightness <= to) return light.setPower(true);
            if (brightness >= from && brightness <= to) {
              return light.setPower(true);
            }

            return light.setPower(false);
          });
        }
      );
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

    Object.assign(group, {
      timer,
    });
  }

  httpHookServer.route(`/${name}`, (request: any) => {
    const {
      urlQuery: { on },
    } = request;

    const handleResult = () => {
      return instance.power ? 'on' : 'off';
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
}

function manageLightGroups(
  lightGroups: LightGroupState[],
  httpHookServer: HttpServer,
  lightGroupIntercepts: LightGroupIntercepts,
  metricAggregates: MetricAggregate[]
) {
  lightGroups.forEach((group) => {
    manageLightGroup(
      group,
      httpHookServer,
      lightGroupIntercepts,
      metricAggregates
    );
  });
}

function manageAllLightsGroup(
  instance: LightGroup,
  httpHookServer: HttpServer
) {
  httpHookServer.route('/allLights', (request: any) => {
    const {
      urlQuery: { on },
    } = request;

    const handleResult = () => {
      return instance.power ? 'on' : 'off';
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
}

function groupWithDoorSensor(
  lightGroups: LightGroupState[],
  doorSensors: DoorSensorState[]
) {
  coupleDoorSensorToLight(
    lightGroups,
    doorSensors,
    'duschbadLamps',
    'duschbadDoor'
  );

  coupleDoorSensorToLight(
    lightGroups,
    doorSensors,
    'wannenbadLamps',
    'wannenbadDoor'
  );
}

function groupWithRfSwitch(lightGroups: LightGroupState[], rfSwitches: any) {
  //  ARBEITSZIMMER
  //    buttons
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'arbeitszimmerBasteltischLedAll',
    'arbeitszimmerButton1',
    4
  );

  //  DUSCHBAD
  //    wall switches
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'duschbadLamps',
    'duschbadWallDoor',
    1
  );

  //  ESSZIMMER
  //    buttons
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'wohnzimmerRelated',
    'esszimmerButton1',
    4
  );

  //  FLUR
  //    wall switches
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'flurDeckenlampe',
    'flurWallFront',
    1
  );
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'flurDeckenlampe',
    'flurWallMiddle',
    1
  );
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'flurDeckenlampe',
    'flurWallBack',
    1
  );

  //  KUECHE
  //    wall switches
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'kuecheLed',
    'kuecheWallLeft',
    1
  );
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'kuecheLed',
    'kuecheWallRight',
    1
  );

  //    buttons
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'kuecheLed',
    'kuecheButtonLeft',
    4
  );

  //  WANNENBAD
  //    wall switches
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'wannenbadLamps',
    'wannenbadWallDoor',
    1
  );

  //  WOHNZIMMER
  //    buttons
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'wohnzimmerRelated',
    'wohnzimmerButton1',
    4
  );
}

// function allLightsGroupWithRfSwitch(allLightsGroup, rfSwitches) {
//   const rfSwitchMatch = rfSwitches.find(({ name }) => {
//     return name === 'wohnzimmer_multi_1';
//   });

//   if (!allLightsGroup || !rfSwitchMatch) return;

//   const { instance: rfSwitchInstance } = rfSwitchMatch;

//   rfSwitchInstance.on(3, () => {
//     allLightsGroup.toggle();
//   });
// }

function lightGroupHmi(group: LightGroupState, hmiServer: HmiServer) {
  const {
    name,
    instance,
    timer,
    attributes: { hmi: hmiDefaults = null } = {},
  } = group as typeof group & {
    timer?: Timer;
  };

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
}

function lightGroupsHmi(groups: LightGroupState[], hmiServer: HmiServer) {
  groups.forEach((group) => {
    lightGroupHmi(group, hmiServer);
  });
}

function allLightsGroupHmi(instance: LightGroup, hmiServer: HmiServer) {
  if (!instance) return;

  const hmi = new HmiElement({
    attributes: {
      category: 'lamps',
      group: '§{all} §{lamps}',
      section: 'global',
      setType: 'trigger',
      sortCategory: '_top',
      type: 'binary-light',
    },
    getter: () => {
      return Promise.resolve(instance.power ? 'on' : 'off');
    },
    name: 'allLights',
    server: hmiServer,
    settable: true,
  });

  instance.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    resolveAlways(instance.toggle());
  });
}

export function manage(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const {
    globals: { lightGroupIntercepts },
  } = config;

  const {
    allLightsGroup,
    doorSensors,
    hmiServer,
    httpHookServer,
    lightGroups,
    metricAggregates,
    rfSwitches,
  } = data;

  manageLightGroups(
    lightGroups,
    httpHookServer,
    lightGroupIntercepts,
    metricAggregates
  );
  manageAllLightsGroup(allLightsGroup, httpHookServer);
  groupWithRfSwitch(lightGroups, rfSwitches);
  groupWithDoorSensor(lightGroups, doorSensors);
  allLightsGroupHmi(allLightsGroup, hmiServer);
  lightGroupsHmi(lightGroups, hmiServer);
}
