/* eslint-disable @typescript-eslint/naming-convention */
import { ReadOnlyProxyObservable } from '../observable.js';
import {
  bme280,
  door,
  mcp9808,
  tsl2561,
  window,
} from '../tree/properties/sensors.js';
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

export const brightness = (
  id: string,
  displayName: string,
  { main }: ReturnType<typeof tsl2561>['brightness'],
): TService => ({
  characteristics: {
    ConfiguredName: {
      value: displayName,
    },
    CurrentAmbientLightLevel: {
      get: main.state,
    },
  },
  displayName,
  service: 'LightSensor',
  subType: id,
});

export const humidity = (
  id: string,
  displayName: string,
  { main }: ReturnType<typeof bme280>['humidity'],
): TService => ({
  characteristics: {
    ConfiguredName: {
      value: displayName,
    },
    CurrentRelativeHumidity: {
      get: main.state,
    },
  },
  displayName,
  service: 'HumiditySensor',
  subType: id,
});

export const temperature = (
  id: string,
  displayName: string,
  {
    main,
  }:
    | ReturnType<typeof bme280>['temperature']
    | ReturnType<typeof mcp9808>['temperature'],
): TService => ({
  characteristics: {
    ConfiguredName: {
      value: displayName,
    },
    CurrentTemperature: {
      get: main.state,
    },
  },
  displayName,
  service: 'TemperatureSensor',
  subType: id,
});
