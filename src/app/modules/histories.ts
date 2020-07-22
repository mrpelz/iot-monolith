import { ApplicationConfig, ApplicationState } from '../app.js';
import { History, Trend } from '../../lib/history/index.js';
import { RecurringMoment, every } from '../../lib/utils/time.js';
import { MetricAggregate } from './metric-aggregates.js';
import { RoomSensorState } from './room-sensors.js';
import { camel } from '../../lib/utils/string.js';
import { resolveAlways } from '../../lib/utils/oop.js';

type HistoryPersistence = {
  value: unknown;
  time: number;
}[];

type HistoriesPersistence = {
  [name: string]: HistoryPersistence;
};

type TrendRange = {
  max: number;
  min: number;
};

type TrendRanges = {
  [name: string]: TrendRange;
};

export type HistoryState = {
  history: History;
  name: string;
  trend: Trend;
};

export type State = {
  histories: HistoryState[];
};

function createHistory(
  name: string,
  retainHours: number,
  max: number,
  min: number,
  historyDb: HistoriesPersistence
) {
  const history = new History({ retainHours });
  const trend = new Trend({
    history,
    max,
    min,
  });

  const handleChange = () => {
    historyDb[name] = history.get().map(({ value, time }) => {
      return {
        time: time.getTime(),
        value,
      };
    });
  };

  const handleInit = () => {
    history.values = (historyDb[name] || []).map(({ value, time }) => {
      return {
        time: new Date(time),
        value,
      };
    });

    history.on('change', handleChange);
    handleChange();
  };

  handleInit();
  return {
    history,
    trend,
  };
}

function roomSensorsHistory(
  roomSensors: RoomSensorState[],
  retainHours: number,
  update: RecurringMoment,
  cleanup: RecurringMoment,
  ranges: TrendRanges,
  historyDb: HistoriesPersistence,
  historyMetrics: string[]
) {
  return roomSensors.map((sensor) => {
    const { name, instance, metrics } = sensor;

    return metrics
      .filter((metric) => {
        return historyMetrics.includes(metric);
      })
      .map((metric) => {
        const historyName = camel(name, metric);
        const { max, min } = ranges[metric] || {};

        const { history, trend } = createHistory(
          historyName,
          retainHours,
          max,
          min,
          historyDb
        );

        update.on('hit', async () => {
          const value = await resolveAlways(instance.getMetric(metric));
          const time = instance.getMetricTime(metric);

          if (value === null || !time) return;

          history.add(value, time);
        });

        cleanup.on('hit', () => {
          history.expunge();
        });

        return {
          history,
          name: historyName,
          trend,
        };
      });
  });
}

function metricAggregatesHistory(
  metricAggregates: MetricAggregate[],
  retainHours: number,
  update: RecurringMoment,
  cleanup: RecurringMoment,
  ranges: TrendRanges,
  historyDb: HistoriesPersistence,
  historyMetrics: string[]
) {
  return metricAggregates
    .filter(({ metric }) => {
      return historyMetrics.includes(metric);
    })
    .map((aggregate) => {
      const { group, instance, metric, type } = aggregate;

      const historyName = camel(group, metric, type);
      const { max, min } = ranges[metric] || {};

      const { history, trend } = createHistory(
        historyName,
        retainHours,
        max,
        min,
        historyDb
      );

      update.on('hit', async () => {
        const value = await resolveAlways(instance.get());
        const time = instance.getTime();

        if (value === null || !time) return;

        history.add(value, time);
      });

      cleanup.on('hit', () => {
        history.expunge();
      });

      return {
        history,
        name: historyName,
        trend,
      };
    });
}

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const {
    globals: {
      historyRetainHours: retainHours,
      historyUpdate: updateTime,
      historyMetrics,
    },
    trends: { metricRanges: ranges },
  } = config;

  const { db, metricAggregates, roomSensors, scheduler } = data;

  const historyDb = db.get<HistoriesPersistence>('histories');

  const update = new RecurringMoment({ scheduler }, every.parse(updateTime));
  update.setMaxListeners(0);

  const cleanup = new RecurringMoment({ scheduler }, every.hour(retainHours));
  cleanup.setMaxListeners(0);

  const histories = [
    [
      roomSensorsHistory(
        roomSensors,
        retainHours,
        update,
        cleanup,
        ranges,
        historyDb,
        historyMetrics
      ),
      metricAggregatesHistory(
        metricAggregates,
        retainHours,
        update,
        cleanup,
        ranges,
        historyDb,
        historyMetrics
      ),
    ],
  ]
    .flat(4)
    .filter(Boolean);

  Object.defineProperty(data, 'histories', {
    value: histories,
  });
}
