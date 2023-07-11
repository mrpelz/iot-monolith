import { AnyReadOnlyObservable } from '../../observable.js';
import { Element } from '../main.js';
import { Gauge } from 'prom-client';
import { Paths } from './paths.js';
import { objectKeys } from '../../oop.js';

const METRIC_NAME_PREFIX = 'iot_';

const cleanValue = (value: number | boolean | null) => {
  if (value === null) return Number.NaN;
  if (typeof value === 'boolean') return value ? 1 : 0;

  return value;
};

const cleanLabel = (label: string) =>
  label.replaceAll(new RegExp('[^a-zA-Z0-9_:]', 'g'), '_').toLowerCase();

const cleanLabelValue = (value: string | number | boolean) => {
  if (typeof value === 'boolean') return value ? 1 : 0;

  return value;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const addMetric = <
  N extends string,
  T extends AnyReadOnlyObservable<number | boolean | null>,
  L extends Record<
    string,
    string | AnyReadOnlyObservable<string | number | boolean>
  >
>(
  metricName: N,
  metricValue: T,
  metricLabels: L = {} as L,
  metricHelp = 'help'
) => ({
  metric: true as const,
  metricHelp,
  metricLabels,
  metricName,
  metricValue,
});

export const setupMetrics = <T extends Element>(
  root: T,
  paths: Paths
): void => {
  for (const element of root.matchChildrenDeep({
    metric: true as const,
  })) {
    const path = paths.getPath(element);
    if (!path) continue;

    const {
      props: { metricHelp, metricLabels, metricName, metricValue },
    } = element as Element<ReturnType<typeof addMetric>>;

    const outputLabels = {
      path: path.join('.'),
    } as Record<string, string | number>;
    let outputValue = cleanValue(metricValue.value);

    const keys = objectKeys(metricLabels);

    const gauge = new Gauge({
      help: metricHelp,
      labelNames: ['path', ...keys.map(cleanLabel)],
      name: `${METRIC_NAME_PREFIX}${cleanLabel(metricName)}`,
    });

    const set = () => gauge.set(outputLabels, outputValue);

    metricValue.observe((value) => {
      outputValue = cleanValue(value);

      set();
    });

    for (const key of keys) {
      const label = metricLabels[key];

      const cleanKey = cleanLabel(key);

      if (typeof label === 'string') {
        outputLabels[cleanKey] = label;

        continue;
      }

      outputLabels[cleanKey] = cleanLabelValue(label.value);

      label.observe((value) => {
        outputLabels[cleanKey] = cleanLabelValue(value);
        set();
      });
    }

    set();
  }
};
