/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../lib/tree.js';
import { Logger } from '../lib/log.js';
import { office } from './rooms/office.js';
import { storage } from './rooms/storage.js';

function firstFloor(logger: Logger) {
  const result = {
    office: office(logger),
    storage: storage(),
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
