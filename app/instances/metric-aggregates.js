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
    const { name, sensors = [], metrics = [] } = group;
    const instances = roomSensors.filter((options) => {
      const { name: sensorName, metrics: sensorMetrics } = options;

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
        name: camel(name, metric),
        group: name,
        metric,
        instance
      };
    });
  })).filter(Boolean);
}());
