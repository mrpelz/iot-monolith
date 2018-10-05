const { Aggregate } = require('../../libs/aggregate');
const { flattenArrays } = require('../../libs/utils/structures');
const { camel } = require('../../libs/utils/string');

(function main() {
  const {
    config: {
      'metric-aggregates': metricAggregates
    },
    roomSensors
  } = global;

  global.metricAggregates = flattenArrays(metricAggregates.map((group) => {
    const {
      attributes,
      metrics = [],
      name,
      sensors = []
    } = group;
    const instances = roomSensors.filter((options) => {
      const { disable = false, name: sensorName, metrics: sensorMetrics } = options;

      if (disable) return null;

      return (
        sensors.includes(sensorName)
        && metrics.every((m) => {
          return sensorMetrics.includes(m);
        })
      );
    }).map(({ instance }) => {
      return instance;
    });

    if (!instances.length) return null;

    return metrics.map((metric) => {
      const instance = new Aggregate(metric, instances);

      return {
        attributes,
        group: name,
        instance,
        metric,
        name: camel(name, metric)
      };
    });
  })).filter(Boolean);
}());
