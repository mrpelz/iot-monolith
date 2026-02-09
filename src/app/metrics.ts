/* eslint-disable complexity */
import { Metrics } from '../lib/metrics.js';
import { excludePattern, match } from '../lib/tree/main.js';
import { Introspection } from '../lib/tree/operations/introspection.js';
import { logger } from './logging.js';
import { system } from './tree/system.js';

export const metrics = new Metrics(logger);

export const attachMetrics = async (
  introspection: Introspection,
): Promise<void> => {
  const system_ = await system;

  // ACTUATORS

  for (const item of match(
    { $: 'actuatorStaleness' as const },
    excludePattern,
    system_,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric(
      'actuatorStaleness_stale',
      item.stale.state,
      labels,
      'is value of related actuator stale?',
    );

    metrics.addMetric(
      'actuatorStaleness_loading',
      item.loading.state,
      labels,
      'is value of related actuator loading?',
    );
  }

  for (const item of match({ $: 'led' as const }, excludePattern, system_)) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric(
      'led_actual',
      item.main.state,
      labels,
      'actual state of led',
    );

    metrics.addMetric(
      'led_set',
      item.main.setState,
      labels,
      'set state of led',
    );

    metrics.addMetric(
      'led_brightness_actual',
      item.brightness.state,
      labels,
      'actual brightness of led',
    );

    metrics.addMetric(
      'led_brightness_set',
      item.brightness.setState,
      labels,
      'set brightness of led',
    );
  }

  for (const item of match({ $: 'output' as const }, excludePattern, system_)) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric(
      'output_actual',
      item.main.state,
      labels,
      'actual state of output',
    );

    metrics.addMetric(
      'output_set',
      item.main.setState,
      labels,
      'set state of output',
    );
  }

  for (const item of match(
    { $: 'ledGrouping' as const },
    excludePattern,
    system_,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric(
      'ledGrouping_actual',
      item.main.state,
      labels,
      'actual state of led group',
    );

    metrics.addMetric(
      'ledGrouping_set',
      item.main.setState,
      labels,
      'set state of led group',
    );

    metrics.addMetric(
      'ledGrouping_brightness_actual',
      item.brightness.state,
      labels,
      'actual brightness of led group',
    );

    metrics.addMetric(
      'ledGrouping_brightness_set',
      item.brightness.setState,
      labels,
      'set brightness of led group',
    );
  }

  for (const item of match(
    { $: 'outputGrouping' as const },
    excludePattern,
    system_,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric(
      'outputGrouping_actual',
      item.main.state,
      labels,
      'actual state of output group',
    );

    metrics.addMetric(
      'outputGrouping_set',
      item.main.setState,
      labels,
      'set state of output group',
    );
  }

  for (const item of match(
    { $: 'ipDevice' as const },
    excludePattern,
    system_,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    const labels_ = { ...labels, host: item.host, port: String(item.port) };

    metrics.addMetric(
      'online_actual',
      item.online.main.state,
      labels_,
      'is device online?',
    );

    metrics.addMetric(
      'online_set',
      item.online.main.setState,
      labels_,
      'is device set to online?',
    );
  }

  for (const item of match({ $: 'scene' as const }, excludePattern, system_)) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('scene', item.state, labels, 'state of scene');
  }

  // LOGIC

  for (const item of match(
    { $: 'offTimer' as const },
    excludePattern,
    system_,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric(
      'offTimer_enabled',
      item.state.isEnabled,
      labels,
      'is timer enabled?',
    );

    metrics.addMetric(
      'offTimer_active',
      item.state.isActive,
      labels,
      'is timer currently running?',
    );

    metrics.addMetric(
      'offTimer_triggerTime',
      item.state.triggerTime,
      labels,
      'when was timer triggered?',
    );

    metrics.addMetric(
      'offTimer_runoutTime',
      item.state.runoutTime,
      labels,
      'when will timer run out?',
    );
  }

  // SENSORS

  for (const item of match(
    { $: 'lastChange' as const },
    excludePattern,
    system_,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric(
      'lastChange',
      item.state,
      labels,
      'when did related sensor value last change?',
    );
  }

  for (const item of match(
    { $: 'lastSeen' as const },
    excludePattern,
    system_,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric(
      'lastSeen',
      item.state,
      labels,
      'when was related sensor value last seen (even without changing)?',
    );
  }

  for (const item of match(
    { $: 'metricStaleness' as const },
    excludePattern,
    system_,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric(
      'metricStaleness',
      item.state,
      labels,
      'is value of related sensor stale?',
    );
  }

  for (const item of match(
    { $: 'humidity' as const },
    excludePattern,
    system_,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('humidity', item.state, {
      ...labels,
      unit: 'percent-rh',
    });
  }

  for (const item of match(
    { $: 'pressure' as const },
    excludePattern,
    system_,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('pressure', item.state, {
      ...labels,
      unit: 'pa',
    });
  }

  for (const item of match(
    { $: 'temperature' as const },
    excludePattern,
    system_,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('temperature', item.state, {
      ...labels,
      unit: 'deg-c',
    });
  }

  // for (const item of match({ $: 'ccs811' as const }, excludePattern, system_)) {
  //   // add ccs811 control metric as soon as needed
  // }

  for (const item of match({ $: 'tvoc' as const }, excludePattern, system_)) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('tvoc', item.state, {
      ...labels,
      unit: 'ppb',
    });
  }

  for (const item of match({ $: 'input' as const }, excludePattern, system_)) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('input', item.state, labels);
  }

  for (const item of match(
    { $: 'inputGrouping' as const },
    excludePattern,
    system_,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('inputGrouping', item.state, labels);
  }

  for (const item of match({ $: 'co2' as const }, excludePattern, system_)) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('co2', item.state, {
      ...labels,
      unit: 'ppm',
    });
  }

  for (const item of match(
    { $: 'mhz19' as const },
    excludePattern,
    system_,
    8,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('mhz19_abc', item.co2.abc.state, labels);

    metrics.addMetric('mhz19_accuracy', item.co2.accuracy.state, {
      ...labels,
      unit: 'percent',
    });

    metrics.addMetric('mhz19_temperature', item.co2.temperature.state, {
      ...labels,
      unit: 'deg-c',
    });

    metrics.addMetric('mhz19_transmittance', item.co2.transmittance.state, {
      ...labels,
      unit: 'percent',
    });
  }

  for (const item of match(
    { $: 'sgp30' as const },
    excludePattern,
    system_,
    8,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('sgp30_eco2', item.tvoc.eco2.state, {
      ...labels,
      unit: 'ppm',
    });

    metrics.addMetric('sgp30_ethanol', item.tvoc.ethanol.state, {
      ...labels,
      unit: 'ppm',
    });

    metrics.addMetric('sgp30_h2', item.tvoc.h2.state, {
      ...labels,
      unit: 'ppm',
    });
  }

  for (const item of match({ $: 'pm025' as const }, excludePattern, system_)) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('pm025', item.state, {
      ...labels,
      unit: 'micrograms/m3',
    });
  }

  for (const item of match({ $: 'pm10' as const }, excludePattern, system_)) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('pm10', item.state, {
      ...labels,
      unit: 'micrograms/m3',
    });
  }

  for (const item of match(
    { $: 'brightness' as const },
    excludePattern,
    system_,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('brightness', item.state, {
      ...labels,
      unit: 'lux',
    });
  }

  for (const item of match(
    { $: 'uvIndex' as const },
    excludePattern,
    system_,
  )) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('uvIndex', item.state, labels);
  }

  for (const item of match({ $: 'door' as const }, excludePattern, system_)) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('door_open', item.open.state, labels);

    metrics.addMetric(
      'door_isReceivedValue',
      item.open.isReceivedValue.state,
      labels,
    );

    metrics.addMetric(
      'door_tamperSwitch',
      item.open.tamperSwitch.state,
      labels,
    );
  }

  for (const item of match({ $: 'window' as const }, excludePattern, system_)) {
    const labels = Metrics.hierarchyLabels(introspection, item);
    if (!labels) continue;

    metrics.addMetric('window_open', item.open.state, labels);

    metrics.addMetric(
      'window_isReceivedValue',
      item.open.isReceivedValue.state,
      labels,
    );

    metrics.addMetric(
      'window_tamperSwitch',
      item.open.tamperSwitch.state,
      labels,
    );
  }
};
