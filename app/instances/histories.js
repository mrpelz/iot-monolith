const { History } = require('../../libs/history');
const { resolveAlways } = require('../../libs/utils/oop');
const { flattenArrays, getKey } = require('../../libs/utils/structures');
const { RecurringMoment, every } = require('../../libs/utils/time');
const { camel } = require('../../libs/utils/string');

function createHistory(name, retainHours, historyDb) {
  const history = new History({ retainHours });

  const handleChange = () => {
    historyDb[name] = history.get().map(({ value, time }) => {
      return {
        value,
        time: time.getTime()
      };
    });
  };

  const handleInit = () => {
    history.values = (historyDb[name] || []).map(({ value, time }) => {
      return {
        value,
        time: new Date(time)
      };
    });

    history.on('change', handleChange);
    handleChange();
  };

  handleInit();
  return history;
}

function roomSensorsHistory(roomSensors, retainHours, update, cleanup, historyDb) {
  return roomSensors.map((sensor) => {
    const {
      name,
      instance: roomSensor,
      metrics
    } = sensor;

    return metrics.map((metric) => {
      const historyName = camel(name, metric);
      const instance = createHistory(historyName, retainHours, historyDb);

      update.on('hit', async () => {
        const value = await resolveAlways(roomSensor.getMetric(metric));
        const time = roomSensor.getMetricTime(metric);

        if (value === null || !time) return;

        instance.add(value, time);
      });

      cleanup.on('hit', () => {
        instance.expunge();
      });

      return {
        name: historyName,
        instance
      };
    });
  });
}

function metricAggregatesHistory(metricAggregates, retainHours, update, cleanup, historyDb) {
  return metricAggregates.map((aggregate) => {
    const {
      group,
      instance: metricAggregate,
      metric,
      type
    } = aggregate;

    const historyName = camel(group, metric, type);
    const instance = createHistory(historyName, retainHours, historyDb);

    update.on('hit', async () => {
      const value = await resolveAlways(metricAggregate.get());
      const time = metricAggregate.getTime();

      if (value === null || !time) return;

      instance.add(value, time);
    });

    cleanup.on('hit', () => {
      instance.expunge();
    });

    return {
      name: historyName,
      instance
    };
  });
}

(function main() {
  const {
    config: {
      globals: {
        historyRetainHours: retainHours,
        historyUpdateSeconds
      }
    },
    db,
    metricAggregates,
    roomSensors,
    scheduler
  } = global;

  const historyDb = getKey(db, 'histories');

  const update = new RecurringMoment(scheduler, every.second(historyUpdateSeconds));
  update.setMaxListeners(0);

  const cleanup = new RecurringMoment(scheduler, every.hour(retainHours));
  cleanup.setMaxListeners(0);

  global.histories = flattenArrays([
    roomSensorsHistory(roomSensors, retainHours, update, cleanup, historyDb),
    metricAggregatesHistory(metricAggregates, retainHours, update, cleanup, historyDb)
  ]).filter(Boolean);
}());
