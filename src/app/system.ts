/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../lib/tree/main.js';
import {
  diningRoom,
  properties as diningRoomProperties,
} from './rooms/dining-room.js';
import { kitchen, properties as kitchenProperties } from './rooms/kitchen.js';
import {
  livingRoom,
  properties as livingRoomProperties,
} from './rooms/living-room.js';
import { bedroom } from './rooms/bedroom.js';
import { office } from './rooms/office.js';
import { outputGrouping } from '../lib/tree/properties/actuators.js';
import { storageRoom } from './rooms/storage-room.js';
import { testRoom } from './rooms/test-room.js';

export const groups = {
  kitchenAdjacentLights: outputGrouping([
    diningRoomProperties.ceilingLight,
    diningRoomProperties.kallaxLedB,
    diningRoomProperties.kallaxLedG,
    diningRoomProperties.kallaxLedR,
    diningRoomProperties.kallaxLedSide,
    diningRoomProperties.kallaxLedW,
    diningRoomProperties.standingLamp,
    diningRoomProperties.tableLight,
    kitchenProperties.ledLeftCWhite,
    kitchenProperties.ledLeftFloodlight,
    kitchenProperties.ledLeftWWhite,
    kitchenProperties.ledRightCWhite,
    kitchenProperties.ledRightFloodlight,
    kitchenProperties.ledRightWWhite,
    livingRoomProperties.ceilingLight,
    livingRoomProperties.standingLamp,
  ]),
};

const firstFloor = (() => {
  const { kitchenAdjacentLights } = groups;

  const result = {
    bedroom,
    diningRoom,
    kitchen,
    kitchenAdjacentLights,
    livingRoom,
    office,
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
    wurstHome,
  };

  metadataStore.set(result, {
    level: Levels.SYSTEM,
  });

  return result;
})();
