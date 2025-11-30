import { AnyObservable } from '@mrpelz/observable';
import { Gauge } from 'prom-client';

import { Input, Logger } from './log.js';
import { Introspection } from './tree/operations/introspection.js';

const METRIC_NAME_PREFIX = 'iot_';

export class Metrics {
  private static _cleanLabelKey(label: string) {
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
    const objectIntrospection = introspection.getObject(object);
    const { id, mainReference } = objectIntrospection ?? {};

    const reference = mainReference ?? objectIntrospection?.shortest;

    if (!id || !reference) {
      return undefined;
    }

    // exclude metrics whoose sole reference path within the tree includes an array index
    if (reference.path.some((key) => typeof key === 'number')) return undefined;

    return {
      id,
      path: reference.pathString,
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
    value: AnyObservable<number | boolean | null>,
    labels: Record<string, string> = {},
    help = 'gauge',
  ): void {
    try {
      const labels_ = Object.fromEntries(
        Object.entries(labels)
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          .toSorted(([keyA], [keyB]) => keyA - keyB)
          .map(
            ([labelKey, labelValue]) =>
              [
                Metrics._cleanLabelKey(labelKey),
                Metrics._cleanLabelValue(labelValue),
              ] as const,
          ),
      );

      const gauge =
        this._gauges.get(name) ??
        new Gauge({
          help,
          labelNames: Object.keys(labels_),
          name: `${METRIC_NAME_PREFIX}${Metrics._cleanLabelKey(name)}`,
        });

      this._gauges.set(name, gauge);

      value.observe((value_) => {
        gauge.set(labels_, Metrics._cleanValue(value_));
      }, true);

      gauge.set(labels_, Metrics._cleanValue(value.value));
    } catch (error) {
      this._log.error(() => error.message, error.stack);
    }
  }
}
