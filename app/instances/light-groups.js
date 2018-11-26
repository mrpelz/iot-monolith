const { LightGroup } = require('../../libs/group');

function createLightGroup(group, allLights) {
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
    return new LightGroup(lights, events);
  } catch (e) {
    return null;
  }
}

function createLightGroups(lightGroups, lights) {
  return lightGroups.map((group) => {
    const { disable = false, name, type } = group;
    if (disable || !name || !type) return null;

    const instance = createLightGroup(group, lights);

    if (!instance) return null;

    return Object.assign(group, {
      instance
    });
  }).filter(Boolean);
}

function createAllLightsGroup(allLights) {
  const lights = allLights.map(({ instance }) => {
    return instance;
  });

  try {
    return new LightGroup(lights);
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

  global.lightGroups = createLightGroups(lightGroups, lights);
  global.allLightsGroup = createAllLightsGroup(lights);
}());
