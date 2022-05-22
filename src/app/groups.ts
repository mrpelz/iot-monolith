import { properties as bathtubBathroomProperties } from './rooms/bathtub-bathroom.js';
import { properties as bedroomProperties } from './rooms/bedroom.js';
import { properties as diningRoomProperties } from './rooms/dining-room.js';
import { properties as hallwayProperties } from './rooms/hallway.js';
import { properties as kitchenProperties } from './rooms/kitchen.js';
import { properties as livingRoomProperties } from './rooms/living-room.js';
import { properties as officeProperties } from './rooms/office.js';
import { outputGrouping } from '../lib/tree/properties/actuators.js';
import { properties as showerBathroomProperties } from './rooms/shower-bathroom.js';
import { properties as storageRoomProperties } from './rooms/storage-room.js';

export const allLights = outputGrouping([
  bathtubBathroomProperties.ceilingLight,
  bathtubBathroomProperties.nightLight,
  bedroomProperties.bedLedRGB.r,
  bedroomProperties.bedLedRGB.g,
  bedroomProperties.bedLedRGB.b,
  bedroomProperties.bedLedDownlightRed,
  bedroomProperties.bedLedW,
  bedroomProperties.ceilingLight,
  bedroomProperties.nightstandLedLeft,
  bedroomProperties.nightstandLedRight,
  bedroomProperties.stoneLamp,
  diningRoomProperties.ceilingLight,
  diningRoomProperties.kallaxLedRGB.r,
  diningRoomProperties.kallaxLedRGB.g,
  diningRoomProperties.kallaxLedRGB.b,
  diningRoomProperties.kallaxLedSide,
  diningRoomProperties.kallaxLedW,
  diningRoomProperties.standingLamp,
  diningRoomProperties.tableLight,
  hallwayProperties.ceilingLightBack,
  hallwayProperties.ceilingLightFront,
  kitchenProperties.ledLeftCWhite,
  kitchenProperties.ledLeftFloodlight,
  kitchenProperties.ledLeftWWhite,
  kitchenProperties.ledRightCWhite,
  kitchenProperties.ledRightFloodlight,
  kitchenProperties.ledRightWWhite,
  livingRoomProperties.ceilingLight,
  livingRoomProperties.standingLamp,
  officeProperties.ceilingLight,
  officeProperties.floodLight,
  officeProperties.workbenchLedCWhite,
  officeProperties.workbenchLedWWhite,
  showerBathroomProperties.ceilingLight,
  showerBathroomProperties.mirrorLight,
  showerBathroomProperties.nightLight,
  storageRoomProperties.ceilingLight,
]);

export const kitchenAdjacentLights = outputGrouping([
  diningRoomProperties.ceilingLight,
  diningRoomProperties.kallaxLedRGB.r,
  diningRoomProperties.kallaxLedRGB.g,
  diningRoomProperties.kallaxLedRGB.b,
  diningRoomProperties.kallaxLedSide,
  diningRoomProperties.kallaxLedW,
  diningRoomProperties.standingLamp,
  diningRoomProperties.tableLight,
  hallwayProperties.ceilingLightBack,
  hallwayProperties.ceilingLightFront,
  kitchenProperties.ledLeftCWhite,
  kitchenProperties.ledLeftFloodlight,
  kitchenProperties.ledLeftWWhite,
  kitchenProperties.ledRightCWhite,
  kitchenProperties.ledRightFloodlight,
  kitchenProperties.ledRightWWhite,
  livingRoomProperties.ceilingLight,
  livingRoomProperties.standingLamp,
]);
