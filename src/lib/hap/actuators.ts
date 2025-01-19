/* eslint-disable @typescript-eslint/naming-convention */
import {
  led as led_,
  output as output_,
  scene as scene_,
} from '../tree/properties/actuators.js';
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
  { main, topic }: ReturnType<typeof output_>,
): TService => ({
  characteristics: {
    On: {
      get: main.state,
      set: main.setState,
    },
  },
  optionalCharacteristics: {
    Name: {
      value: displayName,
    },
  },
  service: mapping[topic] ?? mappingDefault,
  subType: id,
});

export const led = (
  id: string,
  displayName: string,
  { brightness, main }: ReturnType<typeof led_>,
): TService => ({
  characteristics: {
    On: {
      get: main.state,
      set: main.setState,
    },
  },
  optionalCharacteristics: {
    Brightness: {
      get: brightness.state,
      set: brightness.setState,
    },
    Name: {
      value: displayName,
    },
  },
  service: 'Lightbulb',
  subType: id,
});

export const scene = (
  id: string,
  displayName: string,
  { main }: ReturnType<typeof scene_>,
): TService => ({
  characteristics: {
    On: {
      get: main.state,
      set: main.setState,
    },
  },
  optionalCharacteristics: {
    Name: {
      value: displayName,
    },
  },
  service: 'Switch',
  subType: id,
});
