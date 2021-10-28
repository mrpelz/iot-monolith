/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../lib/tree/main.js';
import { bedroom } from './rooms/bedroom.js';
import { diningRoom } from './rooms/dining-room.js';
import { livingRoom } from './rooms/living-room.js';
import { office } from './rooms/office.js';
import { storage } from './rooms/storage.js';
import { testRoom } from './rooms/test-room.js';

function firstFloor() {
  const result = {
    bedroom,
    diningRoom,
    livingRoom: livingRoom(),
    office: office(),
    storage: storage(),
    testRoom: testRoom(),
  };

  metadataStore.set(result, {
    isPartiallyOutside: true,
    isPrimary: true,
    level: Levels.FLOOR,
    name: 'firstFloor',
  });

  return result;
}

function sonninstraße16() {
  const result = {
    firstFloor: firstFloor(),
  };

  metadataStore.set(result, {
    isPrimary: true,
    level: Levels.BUILDING,
    name: 'sonninstraße16',
  });

  return result;
}

function wurstHome() {
  const result = {
    sonninstraße16: sonninstraße16(),
  };

  metadataStore.set(result, {
    level: Levels.HOME,
    name: 'wurstHome',
  });

  return result;
}

export function system() {
  const result = {
    wurstHome: wurstHome(),
  };

  metadataStore.set(result, {
    level: Levels.SYSTEM,
  });

  return result;
}
