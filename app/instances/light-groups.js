const { SingleRelayLightGroup } = require('../../libs/group');

function createSingleRelayLightGroup(group, allLights) {
  const {
    lights: includedLights,
    type: includedType
  } = group;

  const lights = allLights.filter(({ name, type }) => {
    return includedLights.includes(name) && type === includedType;
  }).map(({ instance }) => {
    return instance;
  });

  const events = ['buttonShortpress'];

  try {
    return new SingleRelayLightGroup(lights, events);
  } catch (e) {
    return null;
  }
}

(function main() {
  const {
    config: {
      lights,
      'light-groups': lightGroups
    }
  } = global;

  global.lightGroups = lightGroups.map((group) => {
    const { disable = false, name, type } = group;
    if (disable || !name || !type) return null;

    let instance;

    switch (type) {
      case 'SINGLE_RELAY':
        instance = createSingleRelayLightGroup(group, lights);
        break;
      default:
    }

    if (!instance) return null;

    return Object.assign(group, {
      instance
    });
  }).filter(Boolean);
}());
