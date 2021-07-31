/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { BooleanGroupStrategy, combineBooleanState } from '../state-group.js';
import { BooleanState, NullState } from '../state.js';
import { ProxyObservable, ReadOnlyObservable } from '../observable.js';
import { Device } from '../device/main.js';
import { Indicator } from '../services/indicator.js';
import { Led } from '../items/led.js';
import { Led as LedService } from '../services/led.js';
import { Output } from '../items/output.js';
import { Output as OutputService } from '../services/output.js';
import { metadataStore } from '../hierarchy.js';

function actuatorStaleness<T>(
  state: ReadOnlyObservable<T | null>,
  setState: ReadOnlyObservable<T | null>,
  device: Device
) {
  const stale = new BooleanState(true);
  const loading = new BooleanState(true);

  state.observe((value) => {
    if (setState.value === value) return;
    loading.value = true;
  }, true);

  state.observe((value) => {
    stale.value = value === null;

    if (value !== null && setState.value !== value) return;
    loading.value = false;
  }, true);

  return {
    loading: (() => {
      const result = {
        _get: new ReadOnlyObservable(loading),
      };

      metadataStore.set(result, {
        type: 'boolean',
      });

      return result;
    })(),
    stale: (() => {
      const result = {
        _get: combineBooleanState(
          BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
          true,
          stale,
          // invert online state to be true if device is offline
          new ProxyObservable((online) => !online, device.isOnline)
        ),
      };

      metadataStore.set(result, {
        type: 'boolean',
      });

      return result;
    })(),
  };
}

export function led(device: Device, index = 0, indicator = false) {
  const { actualBrightness, actualOn, setBrightness } = new Led(
    device.addService(new LedService(index)),
    indicator ? device.addService(new Indicator(0)) : undefined
  );

  const result = {
    _get: actualOn,
    _set: new NullState<boolean>(
      (value) => (setBrightness.value = value ? 255 : 0)
    ),
    ...actuatorStaleness(
      actualBrightness,
      new ReadOnlyObservable(setBrightness),
      device
    ),
    brightness: (() => {
      const _brightness = {
        _get: actualBrightness,
        _set: setBrightness,
      };

      metadataStore.set(_brightness, {
        type: 'number',
      });

      return _brightness;
    })(),
    flip: (() => {
      const _flip = {
        _set: new NullState(
          () => (setBrightness.value = actualOn.value ? 0 : 255)
        ),
      };

      metadataStore.set(_flip, {
        type: 'null',
      });

      return _flip;
    })(),
    off: (() => {
      const _off = {
        _set: new NullState(() => (setBrightness.value = 0)),
      };

      metadataStore.set(_off, {
        type: 'null',
      });

      return _off;
    })(),
    on: (() => {
      const _on = {
        _set: new NullState(() => (setBrightness.value = 255)),
      };

      metadataStore.set(_on, {
        type: 'null',
      });

      return _on;
    })(),
  };

  metadataStore.set(result, {
    actuator: 'led',
    type: 'boolean',
  });

  return result;
}

export function output(device: Device, index = 0, indicator = false) {
  const { actualState, setState } = new Output(
    device.addService(new OutputService(index)),
    indicator ? device.addService(new Indicator(0)) : undefined
  );

  const result = {
    _get: actualState,
    _set: setState,
    ...actuatorStaleness(actualState, new ReadOnlyObservable(setState), device),
    flip: (() => {
      const _flip = {
        _set: new NullState(() => setState.flip()),
      };

      metadataStore.set(_flip, {
        type: 'null',
      });

      return _flip;
    })(),
    off: (() => {
      const _off = {
        _set: new NullState(() => (setState.value = false)),
      };

      metadataStore.set(_off, {
        type: 'null',
      });

      return _off;
    })(),
    on: (() => {
      const _on = {
        _set: new NullState(() => (setState.value = true)),
      };

      metadataStore.set(_on, {
        type: 'null',
      });

      return _on;
    })(),
  };

  metadataStore.set(result, {
    actuator: 'output',
    type: 'boolean',
  });

  return result;
}
