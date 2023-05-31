import { properties as diningRoomProperties } from './rooms/dining-room.js';
import { properties as hallwayProperties } from './rooms/hallway.js';
import { properties as kitchenProperties } from './rooms/kitchen.js';
import { properties as livingRoomProperties } from './rooms/living-room.js';
import { properties as mrpelzBathroomProperties } from './rooms/mrpelz-bathroom.js';
import { properties as mrpelzBedroomProperties } from './rooms/mrpelz-bedroom.js';
import { outputGrouping } from '../lib/tree/properties/actuators.js';
import { properties as storageRoomProperties } from './rooms/storage-room.js';
import { properties as tsiaBathroomProperties } from './rooms/tsia-bathroom.js';
import { properties as tsiaBedroomProperties } from './rooms/tsia-bedroom.js';

export const all = outputGrouping(
  [
    diningRoomProperties.ceilingLight,
    diningRoomProperties.fan,
    diningRoomProperties.kallaxLedRGB.$.b,
    diningRoomProperties.kallaxLedRGB.$.g,
    diningRoomProperties.kallaxLedRGB.$.r,
    diningRoomProperties.kallaxLedSide,
    diningRoomProperties.kallaxLedW,
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
    livingRoomProperties.fan,
    livingRoomProperties.standingLamp,
    mrpelzBathroomProperties.ceilingLight,
    mrpelzBathroomProperties.mirrorHeating,
    mrpelzBathroomProperties.mirrorLed,
    mrpelzBathroomProperties.mirrorLight,
    mrpelzBathroomProperties.nightLight,
    mrpelzBedroomProperties.ceilingLight,
    mrpelzBedroomProperties.floodLight,
    mrpelzBedroomProperties.nightLight,
    storageRoomProperties.ceilingLight,
    tsiaBathroomProperties.ceilingLight,
    tsiaBathroomProperties.mirrorLed,
    tsiaBathroomProperties.mirrorLight,
    tsiaBathroomProperties.nightLight,
    tsiaBedroomProperties.ceilingLight,
    tsiaBedroomProperties.standingLamp,
  ],
  'group'
);

export const allLights = outputGrouping([
  diningRoomProperties.ceilingLight,
  diningRoomProperties.kallaxLedRGB.$.b,
  diningRoomProperties.kallaxLedRGB.$.g,
  diningRoomProperties.kallaxLedRGB.$.r,
  diningRoomProperties.kallaxLedSide,
  diningRoomProperties.kallaxLedW,
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
  mrpelzBathroomProperties.ceilingLight,
  mrpelzBathroomProperties.mirrorLed,
  mrpelzBathroomProperties.mirrorLight,
  mrpelzBathroomProperties.nightLight,
  mrpelzBedroomProperties.ceilingLight,
  mrpelzBedroomProperties.floodLight,
  mrpelzBedroomProperties.nightLight,
  storageRoomProperties.ceilingLight,
  tsiaBathroomProperties.ceilingLight,
  tsiaBathroomProperties.mirrorLed,
  tsiaBathroomProperties.mirrorLight,
  tsiaBathroomProperties.nightLight,
  tsiaBedroomProperties.ceilingLight,
  tsiaBedroomProperties.standingLamp,
]);

export const kitchenAdjacentLights = outputGrouping([
  diningRoomProperties.ceilingLight,
  diningRoomProperties.kallaxLedRGB.$.b,
  diningRoomProperties.kallaxLedRGB.$.g,
  diningRoomProperties.kallaxLedRGB.$.r,
  diningRoomProperties.kallaxLedSide,
  diningRoomProperties.kallaxLedW,
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
