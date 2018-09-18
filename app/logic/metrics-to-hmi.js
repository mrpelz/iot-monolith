const { camel } = require('../../libs/utils/string');
const { every } = require('../../libs/utils/time');

const {
  config: {
    globals: {
      valueSanity
    }
  },
  hmi,
  roomSensors
} = global;

roomSensors.forEach((sensor) => {
  const { name, instance, metrics } = sensor;

  metrics.forEach((metric) => {
    const handler = instance.access('get', metric);

    hmi.element(
      camel(name, metric),
      handler,
      valueSanity[metric] || valueSanity.default,
      {},
      every.second()
    );
  });
});
