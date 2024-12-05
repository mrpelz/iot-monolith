/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { epochs } from '../../lib/epochs.js';
import { Level } from '../../lib/tree/main.js';
import { offTimer } from '../../lib/tree/properties/logic.js';
import { persistence } from '../persistence.js';
import { every5Seconds } from '../timings.js';
import { all as _all, allLights, kitchenAdjacentLights } from './groups.js';
import { sunElevation } from './misc.js';
import { diningRoom } from './rooms/dining-room.js';
import { hallway, properties as hallwayProperties } from './rooms/hallway.js';
import { kitchen } from './rooms/kitchen.js';
import { livingRoom } from './rooms/living-room.js';
import { mrpelzBathroom } from './rooms/mrpelz-bathroom.js';
import { mrpelzBedroom } from './rooms/mrpelz-bedroom.js';
import { storageRoom } from './rooms/storage-room.js';
import { testRoom } from './rooms/test-room.js';
import { tsiaBathroom } from './rooms/tsia-bathroom.js';
import { tsiaBedroom } from './rooms/tsia-bedroom.js';
import {
  allLightsOff,
  allOff,
  kitchenAdjacentBright,
  kitchenAdjacentChillax,
} from './scenes.js';

const firstFloor = {
  $: 'firstFloor' as const,
  diningRoom,
  hallway,
  kitchen,
  kitchenAdjacentBright,
  kitchenAdjacentChillax,
  kitchenAdjacentLights,
  level: Level.FLOOR as const,
  livingRoom,
  mrpelzBathroom,
  mrpelzBedroom,
  storageRoom,
  testRoom,
  tsiaBathroom,
  tsiaBedroom,
};

const sonninstraße16 = {
  $: 'sonninstraße16' as const,
  ...sunElevation(every5Seconds),
  firstFloor,
  // eslint-disable-next-line sort-keys
  entryDoor: hallwayProperties.entryDoor,
  level: Level.BUILDING as const,
};

export const wurstHome = {
  $: 'wurstHome' as const,
  level: Level.HOME as const,
  sonninstraße16,
};

export const system = (async () => {
  const all = await _all;

  const allTimer = offTimer(epochs.day, true, ['system/allTimer', persistence]);

  return {
    $: 'system' as const,
    $init: () => {
      all.main.setState.observe((value) => {
        allTimer.active.state.value = value;
      }, true);

      allTimer.state.observe(() => {
        all.main.setState.value = false;
      });
    },
    all,
    allLights,
    allLightsOff,
    allOff,
    allTimer,
    level: Level.SYSTEM as const,
    wurstHome,
  };
})();

export type TSystem = Awaited<typeof system>;
