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
      const getters = instances.map((instance) => {
        return () => {
          return instance.getMetric(metric);
        };
      });

      const getTime = () => {
        return instances.map((instance) => {
          return instance.getMetricTime(metric);
        }).reduce((prev, curr) => {
          if (
            !prev
            || (curr && prev.getTime() < curr.getTime())
          ) {
            return curr;
          }

          return prev;
        }, null);
      };

      const instance = new Aggregate(getters);

      return {
        attributes,
        group: name,
        instance,
        getTime,
        metric,
        name: camel(name, metric)
      };
    });
  })).filter(Boolean);
}());
