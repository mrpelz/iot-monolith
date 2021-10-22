/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../lib/tree.js';
import { Logger } from '../lib/log.js';
import { bedroom } from './rooms/bedroom.js';
import { diningRoom } from './rooms/dining-room.js';
import { livingRoom } from './rooms/living-room.js';
import { office } from './rooms/office.js';
import { storage } from './rooms/storage.js';
import { testRoom } from './rooms/test-room.js';

function firstFloor(logger: Logger) {
  const result = {
    bedroom: bedroom(logger),
    diningRoom: diningRoom(logger),
    livingRoom: livingRoom(logger),
    office: office(logger),
    storage: storage(logger),
    testRoom: testRoom(logger),
  };

  metadataStore.set(result, {
    isPartiallyOutside: true,
    isPrimary: true,
    level: Levels.FLOOR,
    name: 'firstFloor',
  });

  return result;
}

function sonninstraße16(logger: Logger) {
  const result = {
    firstFloor: firstFloor(logger),
  };

  metadataStore.set(result, {
    isPrimary: true,
    level: Levels.BUILDING,
    name: 'sonninstraße16',
  });

  return result;
}

function wurstHome(logger: Logger) {
  const result = {
    sonninstraße16: sonninstraße16(logger),
  };

  metadataStore.set(result, {
    level: Levels.HOME,
    name: 'wurstHome',
  });

  return result;
}

export function system(logger: Logger) {
  const result = {
    wurstHome: wurstHome(logger),
  };

  metadataStore.set(result, {
    level: Levels.SYSTEM,
  });

  return result;
}
