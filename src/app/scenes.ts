import { all, allLights } from './groups.js';
import { properties as diningRoomProperties } from './rooms/dining-room.js';
import { properties as hallwayProperties } from './rooms/hallway.js';
import { properties as kitchenProperties } from './rooms/kitchen.js';
import { properties as livingRoomProperties } from './rooms/living-room.js';
import { scene } from '../lib/tree/properties/actuators.js';

export const kitchenAdjacentChillax = scene(() => {
  diningRoomProperties.ceilingLight._set.value = false;
  diningRoomProperties.kallaxLedRGB.b._set.value = false;
  diningRoomProperties.kallaxLedRGB.g._set.value = false;
  diningRoomProperties.kallaxLedW._set.value = false;
  diningRoomProperties.tableLight._set.value = false;
  hallwayProperties.ceilingLightBack._set.value = false;
  hallwayProperties.ceilingLightFront._set.value = false;
  kitchenProperties.ledLeftCWhite._set.value = false;
  kitchenProperties.ledLeftFloodlight._set.value = false;
  kitchenProperties.ledRightCWhite._set.value = false;
  kitchenProperties.ledRightFloodlight._set.value = false;
  livingRoomProperties.ceilingLight._set.value = false;

  diningRoomProperties.standingLamp._set.value = true;
  livingRoomProperties.standingLamp._set.value = true;
  diningRoomProperties.kallaxLedRGB.r.brightness._set.value = 0.5;
  diningRoomProperties.kallaxLedSide.brightness._set.value = 0.5;
  kitchenProperties.ledLeftWWhite.brightness._set.value = 0.5;
  kitchenProperties.ledRightWWhite.brightness._set.value = 0.5;
}, 'lighting');

export const kitchenAdjacentBright = scene(() => {
  diningRoomProperties.ceilingLight._set.value = true;
  diningRoomProperties.kallaxLedRGB.b._set.value = false;
  diningRoomProperties.kallaxLedRGB.g._set.value = false;
  diningRoomProperties.kallaxLedRGB.r._set.value = false;
  diningRoomProperties.kallaxLedSide.brightness._set.value = 1;
  diningRoomProperties.kallaxLedW.brightness._set.value = 1;
  diningRoomProperties.standingLamp._set.value = true;
  diningRoomProperties.tableLight._set.value = true;
  kitchenProperties.ledLeftCWhite.brightness._set.value = 1;
  kitchenProperties.ledLeftFloodlight.brightness._set.value = 1;
  kitchenProperties.ledLeftWWhite.brightness._set.value = 1;
  kitchenProperties.ledRightCWhite.brightness._set.value = 1;
  kitchenProperties.ledRightFloodlight.brightness._set.value = 1;
  kitchenProperties.ledRightWWhite.brightness._set.value = 1;
  livingRoomProperties.ceilingLight._set.value = true;
  livingRoomProperties.standingLamp._set.value = true;
}, 'lighting');

export const allLightsOff = scene(() => {
  allLights._set.value = false;
}, 'lighting');

export const allOff = scene(() => {
  all._set.value = false;
}, 'scene');
