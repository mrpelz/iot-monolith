/* eslint-disable @typescript-eslint/naming-convention */
import { output as output_ } from '../tree/properties/actuators.js';
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
