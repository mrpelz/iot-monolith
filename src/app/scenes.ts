import {
  SceneMember,
  scene,
  trigger,
} from '../lib/tree/properties/actuators.js';
import { all, allLights } from './groups.js';
import { properties as diningRoomProperties } from './rooms/dining-room.js';
import { properties as hallwayProperties } from './rooms/hallway.js';
import { properties as kitchenProperties } from './rooms/kitchen.js';
import { properties as livingRoomProperties } from './rooms/living-room.js';

export const kitchenAdjacentChillax = scene(
  [
    new SceneMember(diningRoomProperties.ceilingLight._set, false),
    new SceneMember(hallwayProperties.ceilingLightBack._set, false),
    new SceneMember(hallwayProperties.ceilingLightFront._set, false),
    new SceneMember(kitchenProperties.ledLeftCWhite._set, false),
    new SceneMember(kitchenProperties.ledLeftFloodlight._set, false),
    new SceneMember(kitchenProperties.ledLeftWWhite.brightness._set, 0.5, 0),
    new SceneMember(kitchenProperties.ledRightCWhite._set, false),
    new SceneMember(kitchenProperties.ledRightFloodlight._set, false),
    new SceneMember(kitchenProperties.ledRightWWhite.brightness._set, 0.5, 0),
    new SceneMember(livingRoomProperties.ceilingLight._set, false),
    new SceneMember(livingRoomProperties.standingLamp._set, true, false),
  ],
  'lighting'
);

export const kitchenAdjacentBright = scene(
  [
    new SceneMember(diningRoomProperties.ceilingLight._set, true, false),
    new SceneMember(diningRoomProperties.kallaxLedRGB.b._set, false),
    new SceneMember(diningRoomProperties.kallaxLedRGB.g._set, false),
    new SceneMember(diningRoomProperties.kallaxLedRGB.r._set, false),
    new SceneMember(diningRoomProperties.kallaxLedSide.brightness._set, 1, 0),
    new SceneMember(diningRoomProperties.kallaxLedW.brightness._set, 1, 0),
    new SceneMember(diningRoomProperties.tableLight._set, true, false),
    new SceneMember(kitchenProperties.ledLeftCWhite.brightness._set, 1, 0),
    new SceneMember(kitchenProperties.ledLeftFloodlight.brightness._set, 1, 0),
    new SceneMember(kitchenProperties.ledLeftWWhite.brightness._set, 1, 0),
    new SceneMember(kitchenProperties.ledRightCWhite.brightness._set, 1, 0),
    new SceneMember(kitchenProperties.ledRightFloodlight.brightness._set, 1, 0),
    new SceneMember(kitchenProperties.ledRightWWhite.brightness._set, 1, 0),
    new SceneMember(livingRoomProperties.ceilingLight._set, true, false),
    new SceneMember(livingRoomProperties.standingLamp._set, true, false),
  ],
  'lighting'
);

export const allLightsOff = trigger(() => {
  allLights._set.value = false;
}, 'lighting');

export const allOff = trigger(() => {
  all._set.value = false;
}, 'scene');
