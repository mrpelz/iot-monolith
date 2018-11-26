const { parseString } = require('../../libs/utils/string');

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

function groupWithWallSwitch(lightGroups, wallSwitches) {
  const groupMatch = lightGroups.find(({ name }) => {
    return name === 'kuecheAmbience';
  });

  const wallSwitchMatch = wallSwitches.find(({ name }) => {
    return name === 'kuecheButton1';
  });

  if (!groupMatch || !wallSwitchMatch) return;

  const { instance: groupInstance } = groupMatch;
  const { instance: wallSwitchInstance } = wallSwitchMatch;

  wallSwitchInstance.on(0, () => {
    groupInstance.toggle();
  });
}

(function main() {
  const {
    allLightsGroup,
    lightGroups,
    wallSwitches,
    httpHookServer
  } = global;

  manage(lightGroups, httpHookServer);
  manageAllLightsGroup(allLightsGroup, httpHookServer);
  groupWithWallSwitch(lightGroups, wallSwitches);
}());
