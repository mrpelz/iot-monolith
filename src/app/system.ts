/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../lib/tree/main.js';
import { allLights, kitchenAdjacentLights } from './groups.js';
import { bathtubBathroom } from './rooms/bathtub-bathroom.js';
import { bedroom } from './rooms/bedroom.js';
import { diningRoom } from './rooms/dining-room.js';
import { epochs } from '../lib/epochs.js';
import { hallway } from './rooms/hallway.js';
import { kitchen } from './rooms/kitchen.js';
import { kitchenAdjacentChillax } from './scenes.js';
import { livingRoom } from './rooms/living-room.js';
import { offTimer } from '../lib/tree/properties/logic.js';
import { office } from './rooms/office.js';
import { persistence } from './persistence.js';
import { showerBathroom } from './rooms/shower-bathroom.js';
import { storageRoom } from './rooms/storage-room.js';
import { testRoom } from './rooms/test-room.js';

const firstFloor = (() => {
  const result = {
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
  };

  metadataStore.set(result, {
    isPartiallyOutside: true,
    isPrimary: true,
    level: Levels.FLOOR,
    name: 'firstFloor',
  });

  return result;
})();

const sonninstraße16 = (() => {
  const result = {
    firstFloor,
  };

  metadataStore.set(result, {
    isPrimary: true,
    level: Levels.BUILDING,
    name: 'sonninstraße16',
  });

  return result;
})();

const wurstHome = (() => {
  const result = {
    sonninstraße16,
  };

  metadataStore.set(result, {
    isPrimary: true,
    level: Levels.HOME,
    name: 'wurstHome',
  });

  return result;
})();

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

  const result = {
    allLights,
    allLightsTimer,
    wurstHome,
  };

  metadataStore.set(result, {
    id,
    level: Levels.SYSTEM,
  });

  return { id, system: result };
})();
