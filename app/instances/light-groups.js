const { LightGroup } = require('../../libs/group');
const { SingleRelay } = require('../../libs/single-relay');
const { LedLight } = require('../../libs/led');
const { flattenArrays } = require('../../libs/utils/structures');

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

  const events = ['buttonShortpress'];

  try {
    return new LightGroup(instances, events, allOf);
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

(function main() {
  const {
    config: {
      lights,
      'light-groups': lightGroups
    }
  } = global;

  const allLights = flattenArrays(lights.map((light) => {
    const { instance: relayInstance, lights: l = [] } = light;

    if (relayInstance instanceof SingleRelay) {
      return light;
    }

    return l.map((led) => {
      const { instance: ledInstance } = led;

      if (ledInstance instanceof LedLight) {
        return led;
      }

      return null;
    });
  })).filter(Boolean);

  global.lightGroups = createLightGroups(lightGroups, allLights);
  global.allLightsGroup = createAllLightsGroup(allLights);
}());
