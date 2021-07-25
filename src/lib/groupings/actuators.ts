/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { BooleanGroupStrategy, combineBooleanState } from '../state-group.js';
import { BooleanState, NullState } from '../state.js';
import { ProxyObservable, ReadOnlyObservable } from '../observable.js';
import { Device } from '../device/main.js';
import { Indicator } from '../services/indicator.js';
import { Led } from '../items/led.js';
import { Led as LedService } from '../services/led.js';
import { Meta } from '../hierarchy.js';
import { Output } from '../items/output.js';
import { Output as OutputService } from '../services/output.js';

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
    loading: {
      meta: <Meta>{
        type: 'boolean',
      },
      state: new ReadOnlyObservable(loading),
    },
    stale: {
      meta: <Meta>{
        type: 'boolean',
      },
      state: combineBooleanState(
        BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
        true,
        stale,
        // invert online state to be true if device is offline
        new ProxyObservable((online) => !online, device.isOnline)
      ),
    },
  };
}

export function led(device: Device, index = 0, indicator = false) {
  const { actualBrightness, actualOn, setBrightness } = new Led(
    device.addService(new LedService(index)),
    indicator ? device.addService(new Indicator(0)) : undefined
  );

  return {
    meta: <Meta>{
      actuator: 'led',
      type: 'boolean',
    },
    nodes: {
      ...actuatorStaleness(
        actualBrightness,
        new ReadOnlyObservable(setBrightness),
        device
      ),
      brightness: {
        meta: <Meta>{
          type: 'number',
        },
        setter: setBrightness,
        state: actualBrightness,
      },
      flip: {
        meta: <Meta>{
          type: 'null',
        },
        setter: new NullState(
          () => (setBrightness.value = actualOn.value ? 0 : 255)
        ),
      },
      off: {
        meta: <Meta>{
          type: 'null',
        },
        setter: new NullState(() => (setBrightness.value = 0)),
      },
      on: {
        meta: <Meta>{
          type: 'null',
        },
        setter: new NullState(() => (setBrightness.value = 255)),
      },
    },
    setter: new NullState<boolean>(
      (value) => (setBrightness.value = value ? 255 : 0)
    ),
    state: actualOn,
  };
}

export function output(device: Device, index = 0, indicator = false) {
  const { actualState, setState } = new Output(
    device.addService(new OutputService(index)),
    indicator ? device.addService(new Indicator(0)) : undefined
  );

  return {
    meta: <Meta>{
      actuator: 'output',
      type: 'boolean',
    },
    nodes: {
      ...actuatorStaleness(
        actualState,
        new ReadOnlyObservable(setState),
        device
      ),
      flip: {
        meta: <Meta>{
          type: 'null',
        },
        setter: new NullState(() => setState.flip()),
      },
      off: {
        meta: <Meta>{
          type: 'null',
        },
        setter: new NullState(() => (setState.value = false)),
      },
      on: {
        meta: <Meta>{
          type: 'null',
        },
        setter: new NullState(() => (setState.value = true)),
      },
    },
    setter: setState,
    state: actualState,
  };
}
