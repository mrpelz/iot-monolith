import { Aggregate, Type } from '../../lib/aggregate/index.js';
import { ApplicationConfig, ApplicationState } from '../app.js';
import { HmiElement, HmiServer } from '../../lib/hmi/index.js';
import { HistoryState } from './histories.js';
import { HmiConfig } from './hmi-server.js';
import { Prometheus } from '../../lib/prometheus/index.js';
import { camel } from '../../lib/utils/string.js';
import { sanity } from '../../lib/utils/math.js';
import { setUpHistoryTrendHmi } from '../utils/hmi.js';

type MetricAggregatesConfig = ApplicationConfig['metricAggregates'];
type MetricAggregateConfig = MetricAggregatesConfig[number];

export type MetricAggregate = {
  attributes: MetricAggregateConfig['attributes'];
  group: string;
  instance: Aggregate;
  metric: string;
  type: Type;
};

export type State = {
  metricAggregates: MetricAggregate[];
};

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const { metricAggregates: metricAggregatesConfig } = config;

  const { roomSensors } = data;

  const metricAggregates = metricAggregatesConfig
    .map((group) => {
      const { attributes, metrics = [], name, sensors = [], type } = group;
      const instances = roomSensors
        .filter((options) => {
          const {
            disable = false,
            name: sensorName,
            metrics: sensorMetrics,
          } = options;

          if (disable) return null;

          return (
            sensors.includes(sensorName) &&
            metrics.every((m) => {
              return sensorMetrics.includes(m);
            })
          );
        })
        .map(({ instance }) => {
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

        const instance = new Aggregate(
          getters,
          timeGetters,
          stateGetters,
          type
        );

        return {
          attributes,
          group: name,
          instance,
          metric,
          type,
        };
      });
    })
    .flat(4)
    .filter(Boolean) as MetricAggregate[];

  Object.defineProperty(data, 'metricAggregates', {
    value: metricAggregates,
  });
}

function metricAggregatesToPrometheus(
  metricAggregates: MetricAggregate[],
  prometheus: Prometheus
) {
  metricAggregates.forEach((aggregate) => {
    const { group, instance, metric, type } = aggregate;

    prometheus.metric(
      metric,
      {
        location: group,
        subType: type,
        type: 'metric-aggregate',
      },
      instance.get,
      instance.getTime
    );
  });
}

function metricAggrgatesHmi(
  metricAggregates: MetricAggregate[],
  histories: HistoryState[],
  hmiServer: HmiServer,
  unitMap: HmiConfig['unitMap'],
  valueSanity: HmiConfig['valueSanity'],
  trendFactorThreshold: HmiConfig['trendFactorThreshold']
) {
  metricAggregates.forEach((aggregate) => {
    const {
      group,
      instance,
      metric,
      type,
      attributes: { hmi: hmiAttributes = null } = {},
    } = aggregate;

    if (!hmiAttributes) return;

    const hmiName = camel(group, metric, type);
    const getter = () => {
      return instance.get().then((value) => {
        return value === null
          ? null
          : sanity(
              value,
              // https://dev.to/kingdaro/indexing-objects-in-typescript-1cgi
              valueSanity[metric as keyof typeof valueSanity] ||
                valueSanity.default
            );
      });
    };

    const attributes = Object.assign(
      {
        category: `§{air} (§{${type}})`,
        group: camel(group, metric),
        groupLabel: metric,
        section: 'global',
        sortCategory: 'air',
        sortGroup: metric,
        subGroup: group,
        subType: 'aggregate-value',
        type: 'environmental-sensor',
        // https://dev.to/kingdaro/indexing-objects-in-typescript-1cgi
        unit: unitMap[metric as keyof typeof unitMap] || null,
      },
      hmiAttributes
    );

    /* eslint-disable-next-line no-new */
    new HmiElement({
      attributes,
      getter,
      name: hmiName,
      server: hmiServer,
    });

    setUpHistoryTrendHmi(
      histories,
      hmiName,
      attributes,
      hmiServer,
      trendFactorThreshold
    );
  });
}

export function manage(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const {
    hmi: { trendFactorThreshold, unitMap, valueSanity },
  } = config;

  const { histories, hmiServer, metricAggregates, prometheus } = data;

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
