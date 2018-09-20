const { HmiElement } = require('../../libs/hmi');
const { camel } = require('../../libs/utils/string');
const { flattenArrays } = require('../../libs/utils/structures');

const {
  config: {
    globals: {
      valueSanity
    }
  },
  hmiServer,
  roomSensors
} = global;

global.hmiElements = flattenArrays(roomSensors.map((sensor) => {
  const { name, instance, metrics } = sensor;

  return metrics.map((metric) => {
    const hmiName = camel(name, metric);
    const get = instance.access('get', metric);

    const hmiElement = new HmiElement({
      name: hmiName,
      attributes: {
        these: 'are',
        test: 'attributes'
      },
      sanity: valueSanity[metric] || valueSanity.default,
      server: hmiServer,
      handlers: { get }
    });

    return {
      name: hmiName,
      instance: hmiElement
    };
  });
}));
