import {
  scene,
  SceneMember,
  triggerElement,
} from '../../lib/tree/properties/actuators.js';
import { all, allLights } from './groups.js';
import { properties as hallwayProperties } from './rooms/hallway.js';
import { properties as kitchenProperties } from './rooms/kitchen.js';
import { properties as livingRoomProperties } from './rooms/living-room.js';
import { properties as officeProperties } from './rooms/office.js';

export const kitchenAdjacentChillax = scene(
  [
    new SceneMember(hallwayProperties.ceilingLightBack.main.setState, false),
    new SceneMember(hallwayProperties.ceilingLightFront.main.setState, false),
    new SceneMember(kitchenProperties.ledLeftCWhite.brightness.setState, 0),
    new SceneMember(kitchenProperties.ledLeftFloodlight.brightness.setState, 0),
    new SceneMember(
      kitchenProperties.ledLeftWWhite.brightness.setState,
      0.5,
      0,
    ),
    new SceneMember(kitchenProperties.ledRightCWhite.brightness.setState, 0),
    new SceneMember(
      kitchenProperties.ledRightFloodlight.brightness.setState,
      0,
    ),
    new SceneMember(
      kitchenProperties.ledRightWWhite.brightness.setState,
      0.5,
      0,
    ),
    new SceneMember(livingRoomProperties.standingLamp.main.setState, false),
    new SceneMember(
      livingRoomProperties.terrariumLedRed.brightness.setState,
      1,
      0,
    ),
    new SceneMember(
      livingRoomProperties.terrariumLedTop.brightness.setState,
      0,
    ),
    new SceneMember(officeProperties.ceilingLight.main.setState, false),
    new SceneMember(officeProperties.floodlight.main.setState, false),
  ],
  'lighting',
);

export const kitchenAdjacentBright = scene(
  [
    new SceneMember(
      hallwayProperties.ceilingLightBack.main.setState,
      true,
      false,
    ),
    new SceneMember(
      hallwayProperties.ceilingLightFront.main.setState,
      true,
      false,
    ),
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
      livingRoomProperties.standingLamp.main.setState,
      true,
      false,
    ),
    new SceneMember(
      livingRoomProperties.terrariumLedRed.brightness.setState,
      1,
      0,
    ),
    new SceneMember(
      livingRoomProperties.terrariumLedTop.brightness.setState,
      1,
      0,
    ),
    new SceneMember(officeProperties.ceilingLight.main.setState, true, false),
    new SceneMember(officeProperties.floodlight.main.setState, true, false),
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
