const { parseString } = require('../../libs/utils/string');
const { coupleRfSwitchToLight } = require('../utils/lights');
const { resolveAlways } = require('../../libs/utils/oop');

function manageLightGroup(group, httpHookServer) {
  const {
    name,
    instance,
    attributes: {
      light: {
        enableButton = false
      } = {}
    } = {}
  } = group;

  if (enableButton) {
    instance.on('buttonShortpress', () => {
      resolveAlways(instance.toggle());
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

function manage(lightGroups, httpHookServer) {
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

function groupWithRfSwitch(lightGroups, rfSwitches) {
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
    'kuecheAmbience',
    'kuecheWallLeft',
    1
  );
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'kuecheAmbience',
    'kuecheWallRight',
    1
  );

  //    buttons
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'kuecheAmbience',
    'kuecheButtonLeft',
    4
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

(function main() {
  const {
    allLightsGroup,
    httpHookServer,
    lightGroups,
    rfSwitches
  } = global;

  manage(lightGroups, httpHookServer);
  manageAllLightsGroup(allLightsGroup, httpHookServer);
  groupWithRfSwitch(lightGroups, rfSwitches);
  // allLightsGroupWithRfSwitch(allLightsGroup, rfSwitches);
}());
