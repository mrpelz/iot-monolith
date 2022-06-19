/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../lib/tree/main.js';
import { allLights, kitchenAdjacentLights } from './groups.js';
import { allLightsOff, kitchenAdjacentChillax } from './scenes.js';
import { hallway, properties as hallwayProperties } from './rooms/hallway.js';
import { bathtubBathroom } from './rooms/bathtub-bathroom.js';
import { bedroom } from './rooms/bedroom.js';
import { diningRoom } from './rooms/dining-room.js';
import { epochs } from '../lib/epochs.js';
import { kitchen } from './rooms/kitchen.js';
import { livingRoom } from './rooms/living-room.js';
import { offTimer } from '../lib/tree/properties/logic.js';
import { office } from './rooms/office.js';
import { persistence } from './persistence.js';
import { showerBathroom } from './rooms/shower-bathroom.js';
import { storageRoom } from './rooms/storage-room.js';
import { testRoom } from './rooms/test-room.js';

const firstFloor = (() =>
  addMeta(
    {
      bathtubBathroom,
      bedroom,
      diningRoom,
      hallway,
      kitchen,
      kitchenAdjacentChillax,
      kitchenAdjacentLights,
      livingRoom,
      office,
      showerBathroom,
      storageRoom,
      testRoom,
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

  const allLightsTimer = offTimer(epochs.day, true, [
    'system/allLightsTimer',
    persistence,
  ]);

  allLights._set.observe((value) => {
    allLightsTimer.active.$.value = value;
  }, true);

  allLightsTimer.$.observe(() => {
    allLights._set.value = false;
  });

  return {
    id,
    system: addMeta(
      {
        allLights,
        allLightsOff,
        allLightsTimer,
        wurstHome,
      },
      {
        id,
        level: Levels.SYSTEM,
      }
    ),
  };
})();
