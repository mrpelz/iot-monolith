import { Gauge } from 'prom-client';

import { Input, Logger } from '../../log.js';
import { AnyObservable } from '../../observable.js';
import { objectKeys } from '../../oop.js';
import { Introspection } from './introspection.js';

const METRIC_NAME_PREFIX = 'iot_';

export class Metrics {
  private static _cleanLabel(label: string) {
    return label
      .replaceAll(new RegExp('[^a-zA-Z0-9_:]', 'g'), '_')
      .toLowerCase();
  }

  private static _cleanLabelValue(value: string | number | boolean) {
    if (typeof value === 'boolean') return value ? 1 : 0;

    return value;
  }

  private static _cleanValue(value: number | boolean | null) {
    if (value === null) return Number.NaN;
    if (typeof value === 'boolean') return value ? 1 : 0;

    return value;
  }

  static hierarchyLabels(
    introspection: Introspection,
    object: object,
  ): { id: string; path: string } | undefined {
    const { id, mainReference } = introspection.getObject(object) ?? {};

    if (!id || !mainReference) return undefined;

    return {
      id,
      path: Introspection.pathString(mainReference.path),
    };
  }

  private readonly _gauges = new Map<string, Gauge>();
  private readonly _log: Input;

  constructor(logger: Logger) {
    this._log = logger.getInput({
      head: this.constructor.name,
    });
  }

  addMetric(
    name: string,
    help: string,
    value: AnyObservable<number | boolean | null>,
    labels: Record<
      string,
      string | AnyObservable<string | number | boolean>
    > = {},
  ): void {
    try {
      const outputLabels: Record<string, string | number> = {};
      let outputValue = Metrics._cleanValue(value.value);

      const keys = objectKeys(labels);

      const gauge =
        this._gauges.get(name) ??
        new Gauge({
          help,
          labelNames: keys.map((key) => Metrics._cleanLabel(key)).sort(),
          name: `${METRIC_NAME_PREFIX}${Metrics._cleanLabel(name)}`,
        });
      this._gauges.set(name, gauge);

      const set = () => gauge.set(outputLabels, outputValue);

      value.observe((value_) => {
        outputValue = Metrics._cleanValue(value_);
        set();
      });

      for (const key of keys) {
        const label = labels[key];
        if (!label) continue;

        const cleanKey = Metrics._cleanLabel(key);

        if (typeof label === 'string') {
          outputLabels[cleanKey] = label;

          continue;
        }

        outputLabels[cleanKey] = Metrics._cleanLabelValue(label.value);

        label.observe((value_) => {
          outputLabels[cleanKey] = Metrics._cleanLabelValue(value_);
          set();
        });
      }

      set();
    } catch (error) {
      this._log.error(() => error.message, error.stack);
    }
  }
}
