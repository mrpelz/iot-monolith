import { History, Trend } from '../../lib/history/index.js';
import { RecurringMoment, every } from '../../lib/utils/time.js';
import { flattenArrays, getKey } from '../../lib/utils/structures.js';
import { camel } from '../../lib/utils/string.js';
import { resolveAlways } from '../../lib/utils/oop.js';
function createHistory(name, retainHours, max, min, historyDb) {
    const history = new History({ retainHours });
    const trend = new Trend({
        history,
        max,
        min
    });
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
    return {
        history,
        trend
    };
}
function roomSensorsHistory(roomSensors, retainHours, update, cleanup, ranges, historyDb, historyMetrics) {
    return roomSensors.map((sensor) => {
        const { name, instance, metrics } = sensor;
        return metrics.filter((metric) => {
            return historyMetrics.includes(metric);
        }).map((metric) => {
            const historyName = camel(name, metric);
            const { max, min } = ranges[metric] || {};
            const { history, trend } = createHistory(historyName, retainHours, max, min, historyDb);
            update.on('hit', async () => {
                const value = await resolveAlways(instance.getMetric(metric));
                const time = instance.getMetricTime(metric);
                if (value === null || !time)
                    return;
                history.add(value, time);
            });
            cleanup.on('hit', () => {
                history.expunge();
            });
            return {
                name: historyName,
                history,
                trend
            };
        });
    });
}
function metricAggregatesHistory(metricAggregates, retainHours, update, cleanup, ranges, historyDb, historyMetrics) {
    return metricAggregates.filter(({ metric }) => {
        return historyMetrics.includes(metric);
    }).map((aggregate) => {
        const { group, instance, metric, type } = aggregate;
        const historyName = camel(group, metric, type);
        const { max, min } = ranges[metric] || {};
        const { history, trend } = createHistory(historyName, retainHours, max, min, historyDb);
        update.on('hit', async () => {
            const value = await resolveAlways(instance.get());
            const time = instance.getTime();
            if (value === null || !time)
                return;
            history.add(value, time);
        });
        cleanup.on('hit', () => {
            history.expunge();
        });
        return {
            name: historyName,
            history,
            trend
        };
    });
}
export function create(config, data) {
    const { globals: { historyRetainHours: retainHours, historyUpdate: updateTime, historyMetrics }, trends: { metricRanges: ranges } } = config;
    const { db, metricAggregates, roomSensors, scheduler } = data;
    const historyDb = getKey(db, 'histories');
    const update = new RecurringMoment({ scheduler }, every.parse(updateTime));
    update.setMaxListeners(0);
    const cleanup = new RecurringMoment({ scheduler }, every.hour(retainHours));
    cleanup.setMaxListeners(0);
    const histories = flattenArrays([
        roomSensorsHistory(roomSensors, retainHours, update, cleanup, ranges, historyDb, historyMetrics),
        metricAggregatesHistory(metricAggregates, retainHours, update, cleanup, ranges, historyDb, historyMetrics)
    ]).filter(Boolean);
    Object.assign(data, {
        histories
    });
}
//# sourceMappingURL=histories.js.map