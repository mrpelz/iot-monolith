import { properties as diningRoomProperties } from './rooms/dining-room.js';
import { properties as hallwayProperties } from './rooms/hallway.js';
import { properties as kitchenProperties } from './rooms/kitchen.js';
import { properties as livingRoomProperties } from './rooms/living-room.js';
import { scene } from '../lib/tree/properties/actuators.js';

export const kitchenAdjacentChillax = scene(() => {
  diningRoomProperties.ceilingLight._set.value = false;
  diningRoomProperties.kallaxLedB._set.value = false;
  diningRoomProperties.kallaxLedG._set.value = false;
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
  diningRoomProperties.kallaxLedR.brightness._set.value = 0.5;
  diningRoomProperties.kallaxLedSide.brightness._set.value = 0.5;
  kitchenProperties.ledLeftWWhite.brightness._set.value = 0.5;
  kitchenProperties.ledRightWWhite.brightness._set.value = 0.5;
}, 'lighting');
