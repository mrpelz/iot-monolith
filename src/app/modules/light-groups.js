const { LightGroup } = require('../../lib/group');
const { HmiElement } = require('../../lib/hmi');
const { resolveAlways } = require('../../lib/utils/oop');
const { parseString } = require('../../lib/utils/string');
const { Timer } = require('../../lib/utils/time');

const {
  coupleDoorSensorToLight,
  coupleRfSwitchToLight,
  coupleRfToggleToLight,
  coupleRoomSensorToLight
} = require('../utils/lights');
const { setUpLightTimerHmi } = require('../utils/hmi');


function createLightGroup(group, lights) {
  const {
    attributes: {
      light: {
        allOf = false
      } = {}
    } = {},
    lights: includedLights
  } = group;

  const instances = lights.filter(({ name }) => {
    return includedLights.includes(name);
  }).map(({ instance }) => {
    return instance;
  });

  try {
    return new LightGroup(instances, allOf);
  } catch (e) {
    return null;
  }
}

function createLightGroups(lightGroups, lights) {
  return lightGroups.map((group) => {
    const { disable = false, name } = group;
    if (disable || !name) return null;

    const instance = createLightGroup(group, lights);

    if (!instance) return null;

    return Object.assign(group, {
      instance
    });
  }).filter(Boolean);
}

function createAllLightsGroup(lights) {
  const instances = lights.map(({ instance }) => {
    return instance;
  });

  try {
    return new LightGroup(instances);
  } catch (e) {
    return null;
  }
}

function create(config, data) {
  const {
    'light-groups': lightGroupsConfig
  } = config;

  const {
    lights
  } = data;

  Object.assign(data, {
    lightGroups: createLightGroups(lightGroupsConfig, lights),
    allLightsGroup: createAllLightsGroup(lights)
  });
}


function manageLightGroup(group, httpHookServer) {
  const {
    instance,
    name,
    attributes: {
      light: {
        timeout = 0,
        initialTimer = false
      } = {}
    } = {}
  } = group;

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
      timer
    });
  }

  httpHookServer.route(`/${name}`, (request) => {
    const {
      urlQuery: { on }
    } = request;

    const handleResult = () => {
      return instance.power ? 'on' : 'off';
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
}

function manageLightGroups(lightGroups, httpHookServer) {
  lightGroups.forEach((group) => {
    manageLightGroup(group, httpHookServer);
  });
}

function manageAllLightsGroup(instance, httpHookServer) {
  httpHookServer.route('/allLights', (request) => {
    const {
      urlQuery: { on }
    } = request;

    const handleResult = () => {
      return instance.power ? 'on' : 'off';
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
}

function groupWithDoorSensor(lightGroups, doorSensors) {
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

function groupWithRfSwitch(lightGroups, rfSwitches, rfSwitchLongPressTimeout) {
  //  DUSCHBAD
  //    wall switches
  coupleRfToggleToLight(
    lightGroups,
    rfSwitches,
    'duschbadLamps',
    'duschbadWallDoor',
    1,
    rfSwitchLongPressTimeout
  );
  coupleRfToggleToLight(
    lightGroups,
    rfSwitches,
    'duschbadLamps',
    'duschbadWallSink',
    1,
    rfSwitchLongPressTimeout
  );

  //    buttons
  coupleRfToggleToLight(
    lightGroups,
    rfSwitches,
    'duschbadLamps',
    'duschbadButtonShower',
    4,
    rfSwitchLongPressTimeout
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
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'wohnzimmerLedAll',
    'esszimmerMulti1',
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
  coupleRfToggleToLight(
    lightGroups,
    rfSwitches,
    'wannenbadLamps',
    'wannenbadWallDoor',
    1,
    rfSwitchLongPressTimeout
  );
  coupleRfToggleToLight(
    lightGroups,
    rfSwitches,
    'wannenbadLamps',
    'wannenbadWallSink',
    1,
    rfSwitchLongPressTimeout
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
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'wohnzimmerLedAll',
    'wohnzimmerMulti1',
    4
  );
}

function groupWithRoomSensor(lights, roomSensors) {
  coupleRoomSensorToLight(
    lights,
    roomSensors,
    'kuecheLed',
    'kueche'
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

function lightGroupHmi(group, hmiServer) {
  const {
    name,
    instance,
    timer,
    attributes: {
      hmi: hmiDefaults = null
    } = {}
  } = group;

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
}

function lightGroupsHmi(groups, hmiServer) {
  groups.forEach((group) => {
    lightGroupHmi(group, hmiServer);
  });
}

function allLightsGroupHmi(instance, hmiServer) {
  if (!instance) return;

  const hmi = new HmiElement({
    name: 'allLights',
    attributes: {
      category: 'lamps',
      group: '§{all} §{lamps}',
      section: 'global',
      setType: 'trigger',
      sortCategory: '_top',
      type: 'binary-light'
    },
    server: hmiServer,
    getter: () => {
      return Promise.resolve(instance.power ? 'on' : 'off');
    },
    settable: true
  });

  instance.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    resolveAlways(instance.toggle());
  });
}

function manage(config, data) {
  const {
    globals: {
      rfSwitchLongPressTimeout
    }
  } = config;

  const {
    allLightsGroup,
    doorSensors,
    hmiServer,
    httpHookServer,
    lightGroups,
    rfSwitches,
    roomSensors
  } = data;

  manageLightGroups(lightGroups, httpHookServer);
  manageAllLightsGroup(allLightsGroup, httpHookServer);
  groupWithRfSwitch(lightGroups, rfSwitches, rfSwitchLongPressTimeout);
  groupWithDoorSensor(lightGroups, doorSensors);
  groupWithRoomSensor(lightGroups, roomSensors);
  allLightsGroupHmi(allLightsGroup, hmiServer);
  lightGroupsHmi(lightGroups, hmiServer);
}


module.exports = {
  create,
  manage
};
