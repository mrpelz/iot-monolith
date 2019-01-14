const { parseString } = require('../../libs/utils/string');
const { resolveAlways } = require('../../libs/utils/oop');
const { sleep } = require('../../libs/utils/time');
const { coupleRfSwitchToLight } = require('../utils/rf-switches');

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
      instance.toggle();
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
  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'kuecheAmbience',
    'kueche_wall_left',
    1
  );

  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'kuecheAmbience',
    'kueche_wall_right',
    1
  );

  // <😏>
  (() => {
    const lightMatch = lightGroups.find(({ name }) => {
      return name === 'kuecheAmbience';
    });

    const rfSwitchMatch = rfSwitches.find(({ name }) => {
      return name === 'kueche_wall_right';
    });

    if (!lightMatch || !rfSwitchMatch) return;

    const { instance: lightInstance } = lightMatch;
    const { instance: rfSwitchInstance } = rfSwitchMatch;

    rfSwitchInstance.on(2, async () => {
      await resolveAlways(lightInstance.toggle());
      await sleep(1000);
      await resolveAlways(lightInstance.toggle());
      await sleep(1000);
      await resolveAlways(lightInstance.toggle());
    });
  })();
  // </😏>

  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'kuecheAmbience',
    'wohnzimmer_multi_1',
    4
  );

  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'kuecheAmbience',
    'esszimmer_multi_1',
    4
  );

  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'kuecheAmbience',
    'kueche_button_left',
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
