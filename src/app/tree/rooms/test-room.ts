import { espNowButton } from '../../../lib/tree/devices/esp-now-button.js';
import { espNowWindowSensor } from '../../../lib/tree/devices/esp-now-window-sensor.js';
import { motionSensorX6 } from '../../../lib/tree/devices/motion-sensor.js';
import { testDevice } from '../../../lib/tree/devices/test-device.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { inputGrouping } from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { espNowTransport } from '../bridges.js';

export const devices = {
  espNowButton: espNowButton(
    {
      espNow: {
        // prettier-ignore
        macAddress: [0x70, 0x3, 0x9f, 0x7, 0x83, 0xdf],
        transport: espNowTransport,
      },
      wifi: {
        host: 'esp-now-test-button.iot-ng.lan.wurstsalat.cloud',
      },
    },
    context,
  ),
  espNowWindowSensor: espNowWindowSensor(
    {
      espNow: {
        // prettier-ignore
        macAddress: [0xdc, 0x4f, 0x22, 0x57, 0xe7, 0xf0],
        transport: espNowTransport,
      },
      wifi: {
        host: 'esp-now-test-window-sensor.iot-ng.lan.wurstsalat.cloud',
      },
    },
    context,
  ),
  motionSensor: motionSensorX6(
    'hallwaymotionsensor.lan.wurstsalat.cloud',
    context,
  ),
  testDevice: testDevice(context),
};

export const instances = {
  espNowButton0: devices.espNowButton.device.espNow.button0,
  espNowButton1: devices.espNowButton.device.espNow.button1,
};

export const properties = {
  brightness: devices.testDevice.brightness,
  co2: devices.testDevice.co2,
  espNowWindowSensor0: devices.espNowWindowSensor.device.espNow.input0,
  espNowWindowSensor1: devices.espNowWindowSensor.device.espNow.input1,
  espNowWindowSensor2: devices.espNowWindowSensor.device.espNow.input2,
  humidity: devices.testDevice.humidity,
  motion0: devices.testDevice.motion,
  motionPir0: devices.motionSensor.motionPir0,
  motionPir1: devices.motionSensor.motionPir1,
  motionPir2: devices.motionSensor.motionPir2,
  motionRadar0: devices.motionSensor.motionRadar0,
  motionRadar1: devices.motionSensor.motionRadar1,
  motionRadar2: devices.motionSensor.motionRadar2,
  pm025: devices.testDevice.pm025,
  pm10: devices.testDevice.pm10,
  pressure: devices.testDevice.pressure,
  temperature: devices.testDevice.temperature,
  uvIndex: devices.testDevice.uvIndex,
};

export const groups = {
  motion: inputGrouping(
    context,
    [
      properties.motion0,
      properties.motionPir0,
      properties.motionPir1,
      properties.motionPir2,
      properties.motionRadar0,
      properties.motionRadar1,
      properties.motionRadar2,
    ],
    'motion',
  ),
};

const $init: InitFunction = () => {
  // noop
};

export const testRoom = {
  $: 'testRoom' as const,
  $init,
  devices: deviceMap(devices),
  level: Level.ROOM as const,
  ...groups,
  ...instances,
  ...properties,
};
