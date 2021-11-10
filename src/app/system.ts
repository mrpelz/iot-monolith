/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../lib/tree/main.js';
import { allLights, kitchenAdjacentLights } from './groups.js';
import { bathtubBathroom } from './rooms/bathtub-bathroom.js';
import { bedroom } from './rooms/bedroom.js';
import { diningRoom } from './rooms/dining-room.js';
import { kitchen } from './rooms/kitchen.js';
import { livingRoom } from './rooms/living-room.js';
import { office } from './rooms/office.js';
import { showerBathroom } from './rooms/shower-bathroom.js';
import { storageRoom } from './rooms/storage-room.js';
import { testRoom } from './rooms/test-room.js';

const firstFloor = (() => {
  const result = {
    bathtubBathroom,
    bedroom,
    diningRoom,
    kitchen,
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
    level: Levels.HOME,
    name: 'wurstHome',
  });

  return result;
})();

export const system = (() => {
  const result = {
    allLights,
    wurstHome,
  };

  metadataStore.set(result, {
    level: Levels.SYSTEM,
  });

  return result;
})();
