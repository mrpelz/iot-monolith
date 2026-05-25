import { espNowButton } from '../../../lib/tree/devices/esp-now-button.js';
import { espNowWindowSensor } from '../../../lib/tree/devices/esp-now-window-sensor.js';
import { esp32s3zero } from '../../../lib/tree/devices/esp32-s3-zero.js';
import { testDevice } from '../../../lib/tree/devices/test-device.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { inputGrouping } from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { espNowTransport } from '../bridges.js';

// const b = {
//   DEFAULT_FREQUENCY: 3750,
//   C_FREQUENCY: 4186,
//   C_SHARP_FREQUENCY: 4435,
//   D_FREQUENCY: 4699,
//   E_FLAT_FREQUENCY: 4978,
//   E_FREQUENCY: 5274,
//   F_FREQUENCY: 5588,
//   F_SHARP_FREQUENCY: 5920,
//   G_FREQUENCY: 6272,
//   G_SHARP_FREQUENCY: 6645,
//   A_FREQUENCY: 7040,
//   B_FLAT_FREQUENCY: 7459,
//   B_FREQUENCY: 7902,
// };

export const devices = {
  esp32s3zero: esp32s3zero('10.97.1.227', context, undefined, false),
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
  pm025: devices.testDevice.pm025,
  pm10: devices.testDevice.pm10,
  pressure: devices.testDevice.pressure,
  temperature: devices.testDevice.temperature,
  uvIndex: devices.testDevice.uvIndex,
};

export const groups = {
  motion: inputGrouping(context, [properties.motion0], 'motion'),
};

const $init: InitFunction = async () => {
  // let _case: 0 | 1 | 2 = 0;
  // while (true) {
  //   // eslint-disable-next-line no-await-in-loop
  //   await sleep(5000);
  //   // eslint-disable-next-line default-case
  //   switch (_case) {
  //     case 0: {
  //       devices.esp32s3zero.output0.request(off(), true);
  //       devices.esp32s3zero.output1.request(
  //         {
  //           iterations: 1,
  //           sequence: [
  //             {
  //               holdTime: 0,
  //               value: {
  //                 b: 0,
  //                 g: 0,
  //                 r: 0,
  //                 rampTime: 0,
  //               },
  //             },
  //           ],
  //         },
  //         true,
  //       );
  //       _case += 1;
  //       break;
  //     }
  //     case 1: {
  //       devices.esp32s3zero.output0.request(
  //         {
  //           iterations: 1,
  //           sequence: [{ holdTime: 2000, value: { rampTime: 2000, value: 1 } }],
  //         },
  //         true,
  //       );
  //       // devices.esp32s3zero.output3.request(
  //       //   {
  //       //     iterations: 1,
  //       //     sequence: [
  //       //       { holdTime: 50, value: { rampTime: 0, value: 3750 / 2 } },
  //       //       { holdTime: 50, value: { rampTime: 0, value: 0 } },
  //       //       { holdTime: 50, value: { rampTime: 0, value: 3750 } },
  //       //       { holdTime: 50, value: { rampTime: 0, value: 0 } },
  //       //       { holdTime: 50, value: { rampTime: 0, value: 3750 * 1.5 } },
  //       //       { holdTime: 50, value: { rampTime: 0, value: 0 } },
  //       //       { holdTime: 100, value: { rampTime: 0, value: 3750 * 2 } },
  //       //       { holdTime: 100, value: { rampTime: 0, value: 0 } },
  //       //       { holdTime: 50, value: { rampTime: 0, value: 3750 * 2 } },
  //       //       { holdTime: 50, value: { rampTime: 0, value: 0 } },
  //       //       { holdTime: 50, value: { rampTime: 0, value: 3750 * 1.5 } },
  //       //       { holdTime: 50, value: { rampTime: 0, value: 0 } },
  //       //       { holdTime: 50, value: { rampTime: 0, value: 3750 } },
  //       //       { holdTime: 50, value: { rampTime: 0, value: 0 } },
  //       //       { holdTime: 100, value: { rampTime: 0, value: 3750 / 2 } },
  //       //       { holdTime: 0, value: { rampTime: 0, value: 0 } },
  //       //     ],
  //       //   },
  //       //   true,
  //       // );
  //       devices.esp32s3zero.output1.request(
  //         {
  //           iterations: 1,
  //           sequence: [
  //             {
  //               holdTime: 1000,
  //               value: {
  //                 b: 0,
  //                 g: 0,
  //                 r: 1,
  //                 rampTime: 1000,
  //               },
  //             },
  //             {
  //               holdTime: 1000,
  //               value: {
  //                 b: 0,
  //                 g: 1,
  //                 r: 0,
  //                 rampTime: 1000,
  //               },
  //             },
  //             {
  //               holdTime: 1000,
  //               value: {
  //                 b: 1,
  //                 g: 0,
  //                 r: 0,
  //                 rampTime: 1000,
  //               },
  //             },
  //             {
  //               holdTime: 1000,
  //               value: {
  //                 b: 1,
  //                 g: 1,
  //                 r: 1,
  //                 rampTime: 1000,
  //               },
  //             },
  //           ],
  //         },
  //         true,
  //       );
  //       _case += 1;
  //       break;
  //     }
  //     case 2: {
  //       devices.esp32s3zero.output0.request(
  //         {
  //           iterations: 1,
  //           sequence: [{ holdTime: 2000, value: { rampTime: 2000, value: 0 } }],
  //         },
  //         true,
  //       );
  //       devices.esp32s3zero.output1.request(
  //         {
  //           iterations: 1,
  //           sequence: [
  //             {
  //               holdTime: 2000,
  //               value: {
  //                 b: 0,
  //                 g: 0,
  //                 r: 0,
  //                 rampTime: 2000,
  //               },
  //             },
  //           ],
  //         },
  //         true,
  //       );
  //       _case = 0;
  //     }
  //   }
  // }
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
