/* eslint-disable @typescript-eslint/naming-convention */
import { ReadOnlyProxyObservable } from '../observable.js';
import { door, window } from '../tree/properties/sensors.js';
import { TService } from './main.js';

export const doorOrWindow = (
  id: string,
  displayName: string,
  { open }: ReturnType<typeof door | typeof window>,
): TService => ({
  characteristics: {
    ConfiguredName: {
      value: displayName,
    },
    ContactSensorState: {
      get: new ReadOnlyProxyObservable(open.main.state, (value) =>
        value ? 1 : 0,
      ),
    },
    StatusTampered: {
      get: new ReadOnlyProxyObservable(open.tamperSwitch.main.state, (value) =>
        value ? 1 : 0,
      ),
    },
  },
  displayName,
  service: 'ContactSensor',
  subType: id,
});
