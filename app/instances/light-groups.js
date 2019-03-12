const { LightGroup } = require('../../libs/group');
const { SingleRelay } = require('../../libs/single-relay');
const { flattenArrays } = require('../../libs/utils/structures');

function createLightGroup(group, allLights) {
  const {
    attributes: {
      light: {
        allOf = false
      } = {}
    } = {},
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
    return new LightGroup(lights, events, allOf);
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
  const lights = flattenArrays(allLights.map(({ instance: relayInstance, lights: l = [] }) => {
    if (relayInstance instanceof SingleRelay) {
      return relayInstance;
    }

    return l.map(({ instance: ledInstance }) => {
      return ledInstance;
    });
  })).filter(Boolean);

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
