import { Aggregate } from '../../lib/aggregate/index.js';
import { HmiElement } from '../../lib/hmi/index.js';
import { camel } from '../../lib/utils/string.js';
import { flattenArrays } from '../../lib/utils/structures.js';
import { sanity } from '../../lib/utils/math.js';
import { setUpHistoryTrendHmi } from '../utils/hmi.js';


export function create(config, data) {
  const {
    'metric-aggregates': metricAggregatesConfig
  } = config;

  const {
    roomSensors
  } = data;

  const metricAggregates = flattenArrays(metricAggregatesConfig.map((group) => {
    const {
      attributes,
      metrics = [],
      name,
      sensors = [],
      type
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

      const timeGetters = instances.map((instance) => {
        return () => {
          return instance.getMetricTime(metric);
        };
      });

      const stateGetters = instances.map((instance) => {
        return () => {
          return instance.getState(metric);
        };
      });

      const instance = new Aggregate(getters, timeGetters, stateGetters, type);

      return {
        attributes,
        group: name,
        instance,
        metric,
        type
      };
    });
  })).filter(Boolean);

  Object.assign(data, {
    metricAggregates
  });
}


function metricAggregatesToPrometheus(metricAggregates, prometheus) {
  metricAggregates.forEach((aggregate) => {
    const {
      group,
      instance,
      metric,
      type
    } = aggregate;

    prometheus.metric(
      metric,
      {
        location: group,
        type: 'metric-aggregate',
        subType: type
      },
      instance.get,
      instance.getTime
    );
  });
}

function metricAggrgatesHmi(
  metricAggregates,
  histories,
  hmiServer,
  unitMap,
  valueSanity,
  trendFactorThreshold
) {
  metricAggregates.forEach((aggregate) => {
    const {
      group,
      instance,
      metric,
      type,
      attributes: {
        hmi: hmiAttributes = null
      } = {}
    } = aggregate;

    if (!hmiAttributes) return;

    const hmiName = camel(group, metric, type);
    const getter = () => {
      return instance.get().then((value) => {
        return value === null ? null : sanity(
          value,
          valueSanity[metric] || valueSanity.default
        );
      });
    };

    const attributes = Object.assign({
      category: `§{air} (§{${type}})`,
      group: camel(group, metric),
      groupLabel: metric,
      section: 'global',
      sortCategory: 'air',
      sortGroup: metric,
      subGroup: group,
      subType: 'aggregate-value',
      type: 'environmental-sensor',
      unit: unitMap[metric] || null
    }, hmiAttributes);

    /* eslint-disable-next-line no-new */
    new HmiElement({
      name: hmiName,
      attributes,
      server: hmiServer,
      getter
    });

    setUpHistoryTrendHmi(histories, hmiName, attributes, hmiServer, trendFactorThreshold);
  });
}

export function manage(config, data) {
  const {
    hmi: {
      trendFactorThreshold,
      unitMap,
      valueSanity
    }
  } = config;

  const {
    histories,
    hmiServer,
    metricAggregates,
    prometheus,
  } = data;

  metricAggregatesToPrometheus(metricAggregates, prometheus);
  metricAggrgatesHmi(
    metricAggregates,
    histories,
    hmiServer,
    unitMap,
    valueSanity,
    trendFactorThreshold
  );
}
