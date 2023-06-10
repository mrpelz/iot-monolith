/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Level, element, symbolLevel } from '../lib/tree/main-ng.js';
import { all, allLights, kitchenAdjacentLights } from './groups.js';
import {
  allLightsOff,
  allOff,
  kitchenAdjacentBright,
  kitchenAdjacentChillax,
} from './scenes.js';
import { hallway, properties as hallwayProperties } from './rooms/hallway.js';
import { epochs } from '../lib/epochs.js';
import { every5Seconds } from './timings.js';
import { kitchen } from './rooms/kitchen.js';
import { livingRoom } from './rooms/living-room.js';
import { mrpelzBathroom } from './rooms/mrpelz-bathroom.js';
import { mrpelzBedroom } from './rooms/mrpelz-bedroom.js';
import { offTimer } from '../lib/tree/properties/logic.js';
import { office } from './rooms/office.js';
import { persistence } from './persistence.js';
import { storageRoom } from './rooms/storage-room.js';
import { sunElevation } from './misc.js';
import { testRoom } from './rooms/test-room.js';
import { tsiaBathroom } from './rooms/tsia-bathroom.js';
import { tsiaBedroom } from './rooms/tsia-bedroom.js';

const firstFloor = element({
  diningRoom: Object.assign(diningRoom, {
    kitchenAdjacentBright,
    kitchenAdjacentChillax,
    kitchenAdjacentLights,
  }),
  hallway: Object.assign(hallway, {
    kitchenAdjacentChillax,
    kitchenAdjacentLights,
  }),
  kitchen: Object.assign(kitchen, {
    kitchenAdjacentBright,
    kitchenAdjacentChillax,
    kitchenAdjacentLights,
  }),
  kitchenAdjacentBright,
  kitchenAdjacentChillax,
  kitchenAdjacentLights,
  livingRoom: Object.assign(livingRoom, {
    kitchenAdjacentBright,
    kitchenAdjacentChillax,
    kitchenAdjacentLights,
  }),
  mrpelzBathroom,
  mrpelzBedroom,
  storageRoom,
  [symbolLevel]: Level.FLOOR,
  testRoom,
  tsiaBathroom,
  tsiaBedroom,
});

const sonninstraße16 = element({
  ...sunElevation(every5Seconds),
  firstFloor,
  // eslint-disable-next-line sort-keys
  entryDoor: hallwayProperties.door,
  [symbolLevel]: Level.BUILDING,
});

const wurstHome = element({ sonninstraße16, [symbolLevel]: Level.HOME });

export const system = (() => {
  const id = Date.now().toString();

  const allTimer = offTimer(epochs.day, true, ['system/allTimer', persistence]);

  all.main.setState.observe((value) => {
    allTimer.active.instance.value = value;
  }, true);

  allTimer.instance.observe(() => {
    all.main.setState.value = false;
  });

  return {
    id,
    system: element({
      all,
      allLights,
      allLightsOff,
      allOff,
      allTimer,
      [symbolLevel]: Level.SYSTEM,
      wurstHome,
    }),
  };
})();
