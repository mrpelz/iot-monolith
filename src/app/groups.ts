import { properties as hallwayProperties } from './rooms/hallway.js';
import { properties as kitchenProperties } from './rooms/kitchen.js';
import { properties as livingRoomProperties } from './rooms/living-room.js';
import { properties as mrpelzBathroomProperties } from './rooms/mrpelz-bathroom.js';
import { properties as mrpelzBedroomProperties } from './rooms/mrpelz-bedroom.js';
import { properties as officeProperties } from './rooms/office.js';
import { outputGrouping } from '../lib/tree/properties/actuators.js';
import { properties as storageRoomProperties } from './rooms/storage-room.js';
import { properties as tsiaBathroomProperties } from './rooms/tsia-bathroom.js';
import { properties as tsiaBedroomProperties } from './rooms/tsia-bedroom.js';

export const all = outputGrouping(
  [
    hallwayProperties.ceilingLightBack,
    hallwayProperties.ceilingLightFront,
    kitchenProperties.ledLeftCWhite,
    kitchenProperties.ledLeftFloodlight,
    kitchenProperties.ledLeftWWhite,
    kitchenProperties.ledRightCWhite,
    kitchenProperties.ledRightFloodlight,
    kitchenProperties.ledRightWWhite,
    livingRoomProperties.standingLamp,
    mrpelzBathroomProperties.ceilingLight,
    mrpelzBathroomProperties.mirrorHeating,
    mrpelzBathroomProperties.mirrorLed,
    mrpelzBathroomProperties.mirrorLight,
    mrpelzBathroomProperties.nightLight,
    mrpelzBedroomProperties.ceilingLight,
    mrpelzBedroomProperties.nightLight,
    mrpelzBedroomProperties.standingLamp,
    officeProperties.floodlight,
    officeProperties.ceilingLight,
    storageRoomProperties.ceilingLight,
    tsiaBathroomProperties.ceilingLight,
    tsiaBathroomProperties.mirrorLed,
    tsiaBathroomProperties.mirrorLight,
    tsiaBathroomProperties.nightLight,
    tsiaBedroomProperties.ceilingLight,
    tsiaBedroomProperties.fan,
    tsiaBedroomProperties.standingLamp,
  ],
  'group'
);

export const allLights = outputGrouping([
  officeProperties.ceilingLight,
  officeProperties.floodlight,
  hallwayProperties.ceilingLightBack,
  hallwayProperties.ceilingLightFront,
  kitchenProperties.ledLeftCWhite,
  kitchenProperties.ledLeftFloodlight,
  kitchenProperties.ledLeftWWhite,
  kitchenProperties.ledRightCWhite,
  kitchenProperties.ledRightFloodlight,
  kitchenProperties.ledRightWWhite,
  livingRoomProperties.standingLamp,
  mrpelzBathroomProperties.ceilingLight,
  mrpelzBathroomProperties.mirrorLed,
  mrpelzBathroomProperties.mirrorLight,
  mrpelzBathroomProperties.nightLight,
  mrpelzBedroomProperties.ceilingLight,
  mrpelzBedroomProperties.nightLight,
  mrpelzBedroomProperties.standingLamp,
  storageRoomProperties.ceilingLight,
  tsiaBathroomProperties.ceilingLight,
  tsiaBathroomProperties.mirrorLed,
  tsiaBathroomProperties.mirrorLight,
  tsiaBathroomProperties.nightLight,
  tsiaBedroomProperties.ceilingLight,
  tsiaBedroomProperties.standingLamp,
]);

export const kitchenAdjacentLights = outputGrouping([
  officeProperties.floodlight,
  officeProperties.ceilingLight,
  hallwayProperties.ceilingLightBack,
  hallwayProperties.ceilingLightFront,
  kitchenProperties.ledLeftCWhite,
  kitchenProperties.ledLeftFloodlight,
  kitchenProperties.ledLeftWWhite,
  kitchenProperties.ledRightCWhite,
  kitchenProperties.ledRightFloodlight,
  kitchenProperties.ledRightWWhite,
  livingRoomProperties.standingLamp,
]);
