/* eslint-disable sort-keys */
/* eslint-disable @typescript-eslint/naming-convention */
import { sleep } from '@mrpelz/misc-utils/sleep';

import { melody } from '../../../lib/services/output-ng-buzzer.js';
import { blink } from '../../../lib/services/output-ng-dimmable.js';
import { blinkRGBInclusive } from '../../../lib/services/output-ng-dimmable-rgb.js';
import { esp32s3zero } from '../../../lib/tree/devices/esp32-s3-zero.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { context } from '../../context.js';

const b = {
  DEFAULT_FREQUENCY: 3750,
  C_FREQUENCY: 4186,
  C_SHARP_FREQUENCY: 4435,
  D_FREQUENCY: 4699,
  E_FLAT_FREQUENCY: 4978,
  E_FREQUENCY: 5274,
  F_FREQUENCY: 5588,
  F_SHARP_FREQUENCY: 5920,
  G_FREQUENCY: 6272,
  G_SHARP_FREQUENCY: 6645,
  A_FREQUENCY: 7040,
  B_FLAT_FREQUENCY: 7459,
  B_FREQUENCY: 7902,
};

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
    devices.esp32s3zero.buzzer0.state.set(
      melody([
        b.C_FREQUENCY,
        b.D_FREQUENCY,
        b.E_FREQUENCY,
        b.F_FREQUENCY,
        b.G_FREQUENCY,
        0,
        b.G_FREQUENCY,
        0,
        b.E_FREQUENCY,
        b.E_FREQUENCY,
        b.E_FREQUENCY,
        b.E_FREQUENCY,
        b.G_FREQUENCY,
        0,
        b.E_FREQUENCY,
        b.E_FREQUENCY,
        b.E_FREQUENCY,
        b.E_FREQUENCY,
        b.G_FREQUENCY,
        0,
        b.F_FREQUENCY,
        b.F_FREQUENCY,
        b.F_FREQUENCY,
        b.F_FREQUENCY,
        b.E_FREQUENCY,
        0,
        b.E_FREQUENCY,
        0,
        b.D_FREQUENCY,
        b.D_FREQUENCY,
        b.D_FREQUENCY,
        b.D_FREQUENCY,
        b.C_FREQUENCY,
      ]),
    );
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
