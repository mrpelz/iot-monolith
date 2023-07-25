import { Gauge } from 'prom-client';

import { Logger } from '../../log.js';
import { AnyReadOnlyObservable } from '../../observable.js';
import { objectKeys } from '../../oop.js';
import { Element } from '../main.js';
import { Paths } from './paths.js';

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

export const addMetric = <
  N extends string,
  T extends AnyReadOnlyObservable<number | boolean | null>,
  L extends Record<
    string,
    string | AnyReadOnlyObservable<string | number | boolean>
  >,
>(
  metricName: N,
  metricValue: T,
  metricLabels: L = {} as L,
  metricHelp = 'help',
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
) => ({
  metric: true as const,
  metricHelp,
  metricLabels,
  metricName,
  metricValue,
});

export const setupMetrics = <T extends Element>(
  logger: Logger,
  root: T,
  paths: Paths,
): void => {
  const log = logger.getInput({
    head: 'setupMetrics',
  });

  for (const element of root.matchChildrenDeep({
    metric: true as const,
  })) {
    try {
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
    } catch (error) {
      log.error(() => error.message, error.stack);
    }
  }
};
