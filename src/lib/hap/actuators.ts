/* eslint-disable @typescript-eslint/naming-convention */
import {
  Observable,
  ProxyObservable,
  ReadOnlyProxyObservable,
} from '../observable.js';
import {
  led as led_,
  ledGrouping as ledGrouping_,
  output as output_,
  outputGrouping as outputGrouping_,
  scene as scene_,
  triggerElement as triggerElement_,
} from '../tree/properties/actuators.js';
import { offTimer } from '../tree/properties/logic.js';
import { TService } from './main.js';
import { TServiceKey } from './types.js';

const mapping: Record<string, TServiceKey> = {
  fan: 'Fan',
  lighting: 'Lightbulb',
};

const mappingDefault = 'Outlet';

export const output = (
  id: string,
  displayName: string,
  { main, topic }: ReturnType<typeof output_ | typeof outputGrouping_>,
): TService => ({
  characteristics: {
    ConfiguredName: {
      value: displayName,
    },
    On: {
      get: main.state,
      set: main.setState,
    },
  },
  displayName,
  service: mapping[topic] ?? mappingDefault,
  subType: id,
});

export const led = (
  id: string,
  displayName: string,
  { brightness, main }: ReturnType<typeof led_ | typeof ledGrouping_>,
): TService => ({
  characteristics: {
    Brightness: {
      get: new ReadOnlyProxyObservable(brightness.state, (value) =>
        value === null ? null : value * 100,
      ),
      set: new ProxyObservable(
        brightness.setState,
        (value) => value * 100,
        (value) => value / 100,
      ),
    },
    ConfiguredName: {
      value: displayName,
    },
    On: {
      get: main.state,
      set: main.setState,
    },
  },
  displayName,
  service: 'Lightbulb',
  subType: id,
});

export const trigger = (
  id: string,
  displayName: string,
  { main }: ReturnType<typeof triggerElement_>,
): TService => ({
  characteristics: {
    ConfiguredName: {
      value: displayName,
    },
    On: {
      get: new Observable(false),
      set: new Observable(null, () => main.setState.trigger(), true),
    },
  },
  displayName,
  service: 'Switch',
  subType: id,
});

export const scene = (
  id: string,
  displayName: string,
  { main }: ReturnType<typeof scene_ | typeof offTimer>,
): TService => ({
  characteristics: {
    ConfiguredName: {
      value: displayName,
    },
    On: {
      get: main.state,
      set: main.setState,
    },
  },
  displayName,
  service: 'Switch',
  subType: id,
});
