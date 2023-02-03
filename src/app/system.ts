/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../lib/tree/main.js';
import { all, allLights, kitchenAdjacentLights } from './groups.js';
import {
  allLightsOff,
  allOff,
  kitchenAdjacentBright,
  kitchenAdjacentChillax,
} from './scenes.js';
import { hallway, properties as hallwayProperties } from './rooms/hallway.js';
import { diningRoom } from './rooms/dining-room.js';
import { epochs } from '../lib/epochs.js';
import { every5Seconds } from './timings.js';
import { kitchen } from './rooms/kitchen.js';
import { livingRoom } from './rooms/living-room.js';
import { mrpelzBathroom } from './rooms/mrpelz-bathroom.js';
import { mrpelzBedroom } from './rooms/mrpelz-bedroom.js';
import { offTimer } from '../lib/tree/properties/logic.js';
import { persistence } from './persistence.js';
import { storageRoom } from './rooms/storage-room.js';
import { sunElevation } from './misc.js';
import { testRoom } from './rooms/test-room.js';
import { tsiaBathroom } from './rooms/tsia-bathroom.js';
import { tsiaBedroom } from './rooms/tsia-bedroom.js';

const firstFloor = (() =>
  addMeta(
    {
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
      testRoom,
      tsiaBathroom,
      tsiaBedroom,
    },
    {
      isPartiallyOutside: true,
      isPrimary: true,
      level: Levels.FLOOR,
      name: 'firstFloor',
    }
  ))();

const sonninstraße16 = (() =>
  addMeta(
    {
      ...sunElevation(every5Seconds),
      firstFloor,
      // eslint-disable-next-line sort-keys
      entryDoor: hallwayProperties.door,
    },
    {
      isPrimary: true,
      level: Levels.BUILDING,
      name: 'sonninstraße16',
    }
  ))();

const wurstHome = (() =>
  addMeta(
    { sonninstraße16 },
    {
      isPrimary: true,
      level: Levels.HOME,
      name: 'wurstHome',
    }
  ))();

export const system = (() => {
  const id = Date.now().toString();

  const allTimer = offTimer(epochs.day, true, ['system/allTimer', persistence]);

  all._set.observe((value) => {
    allTimer.active.$.value = value;
  }, true);

  allTimer.$.observe(() => {
    all._set.value = false;
  });

  return {
    id,
    system: addMeta(
      {
        all,
        allLights,
        allLightsOff,
        allOff,
        allTimer,
        wurstHome,
      },
      {
        id,
        level: Levels.SYSTEM,
      }
    ),
  };
})();
