import { sleep } from '@mrpelz/misc-utils/sleep';

import { blink } from '../../../lib/services/output-ng-dimmable.js';
import { blinkRGBInclusive } from '../../../lib/services/output-ng-dimmable-rgb.js';
import { esp32s3zero } from '../../../lib/tree/devices/esp32-s3-zero.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { context } from '../../context.js';

export const devices = {
  esp32s3zero: {
    $exclude: true as const,
    ...esp32s3zero(
      'testroom-esp32s3zero.lan.wurstsalat.cloud',
      context,
      undefined,
    ),
  },
};

export const instances = {};

export const properties = {};

export const groups = {};

const $init: InitFunction = async () => {
  devices.esp32s3zero.device.online.main.state.observe(async (isOnline) => {
    if (!isOnline) return;
    await sleep(3000);

    devices.esp32s3zero.ledRGB1.state.set(
      blinkRGBInclusive(undefined, 0, 3000),
    );
    devices.esp32s3zero.led0.state.set(blink(undefined, 0, 0, 30_000));
  });
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
