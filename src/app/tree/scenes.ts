import {
  scene,
  SceneMember,
  triggerElement,
} from '../../lib/tree/properties/actuators.js';
import { all, allLights } from './groups.js';
import { properties as diningRoomProperties } from './rooms/dining-room.js';
import { properties as hallwayProperties } from './rooms/hallway.js';
import { properties as kitchenProperties } from './rooms/kitchen.js';
import { properties as livingRoomProperties } from './rooms/living-room.js';

export const kitchenAdjacentChillax = scene(
  [
    new SceneMember(diningRoomProperties.ceilingLight.main.setState, false),
    new SceneMember(diningRoomProperties.kallaxLedRGB.b.main.setState, false),
    new SceneMember(diningRoomProperties.kallaxLedRGB.g.main.setState, false),
    new SceneMember(
      diningRoomProperties.kallaxLedRGB.r.brightness.setState,
      0.5,
      0,
    ),
    new SceneMember(
      diningRoomProperties.kallaxLedSide.brightness.setState,
      0.5,
      0,
    ),
    new SceneMember(diningRoomProperties.kallaxLedW.main.setState, false),
    new SceneMember(diningRoomProperties.tableLight.main.setState, false),
    new SceneMember(hallwayProperties.ceilingLightBack.main.setState, false),
    new SceneMember(hallwayProperties.ceilingLightFront.main.setState, false),
    new SceneMember(kitchenProperties.ledLeftCWhite.main.setState, false),
    new SceneMember(kitchenProperties.ledLeftFloodlight.main.setState, false),
    new SceneMember(
      kitchenProperties.ledLeftWWhite.brightness.setState,
      0.5,
      0,
    ),
    new SceneMember(kitchenProperties.ledRightCWhite.main.setState, false),
    new SceneMember(kitchenProperties.ledRightFloodlight.main.setState, false),
    new SceneMember(
      kitchenProperties.ledRightWWhite.brightness.setState,
      0.5,
      0,
    ),
    new SceneMember(livingRoomProperties.ceilingLight.main.setState, false),
    new SceneMember(
      livingRoomProperties.standingLamp.main.setState,
      true,
      false,
    ),
  ],
  'lighting',
);

export const kitchenAdjacentBright = scene(
  [
    new SceneMember(
      diningRoomProperties.ceilingLight.main.setState,
      true,
      false,
    ),
    new SceneMember(diningRoomProperties.kallaxLedRGB.b.main.setState, false),
    new SceneMember(diningRoomProperties.kallaxLedRGB.g.main.setState, false),
    new SceneMember(diningRoomProperties.kallaxLedRGB.r.main.setState, false),
    new SceneMember(
      diningRoomProperties.kallaxLedSide.brightness.setState,
      1,
      0,
    ),
    new SceneMember(diningRoomProperties.kallaxLedW.brightness.setState, 1, 0),
    new SceneMember(diningRoomProperties.tableLight.main.setState, true, false),
    new SceneMember(kitchenProperties.ledLeftCWhite.brightness.setState, 1, 0),
    new SceneMember(
      kitchenProperties.ledLeftFloodlight.brightness.setState,
      1,
      0,
    ),
    new SceneMember(kitchenProperties.ledLeftWWhite.brightness.setState, 1, 0),
    new SceneMember(kitchenProperties.ledRightCWhite.brightness.setState, 1, 0),
    new SceneMember(
      kitchenProperties.ledRightFloodlight.brightness.setState,
      1,
      0,
    ),
    new SceneMember(kitchenProperties.ledRightWWhite.brightness.setState, 1, 0),
    new SceneMember(
      livingRoomProperties.ceilingLight.main.setState,
      true,
      false,
    ),
    new SceneMember(
      livingRoomProperties.standingLamp.main.setState,
      true,
      false,
    ),
  ],
  'lighting',
);

export const allLightsOff = triggerElement(async () => {
  const allLights_ = await allLights;
  allLights_.main.setState.value = false;
}, 'lighting');

export const allOff = triggerElement(async () => {
  const all_ = await all;
  all_.main.setState.value = false;
}, 'scene');
