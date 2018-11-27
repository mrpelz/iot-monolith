const { parseString } = require('../../libs/utils/string');
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
    'kuecheButton1',
    1
  );

  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'kuecheAmbience',
    'kuecheButton2',
    1
  );

  coupleRfSwitchToLight(
    lightGroups,
    rfSwitches,
    'kuecheAmbience',
    'multiWZ',
    4
  );
}

function allLightsGroupWithRfSwitch(allLightsGroup, rfSwitches) {
  const rfSwitchMatch = rfSwitches.find(({ name }) => {
    return name === 'multiWZ';
  });

  if (!allLightsGroup || !rfSwitchMatch) return;

  const { instance: rfSwitchInstance } = rfSwitchMatch;

  rfSwitchInstance.on(3, () => {
    allLightsGroup.toggle();
  });
}

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
  allLightsGroupWithRfSwitch(allLightsGroup, rfSwitches);
}());
