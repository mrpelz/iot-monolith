import {
  SceneMember,
  scene,
  trigger,
} from '../../lib/tree/properties/actuators.js';
import { all, allLights } from './groups.js';
import { properties as hallwayProperties } from './rooms/hallway.js';
import { properties as kitchenProperties } from './rooms/kitchen.js';
import { properties as livingRoomProperties } from './rooms/living-room.js';
import { properties as officeProperties } from './rooms/office.js';

export const kitchenAdjacentChillax = scene(
  [
    new SceneMember(
      diningRoomProperties.ceilingLight.props.main.props.setState,
      false
    ),
    new SceneMember(
      diningRoomProperties.kallaxLedRGB.props.b.props.main.props.setState,
      false
    ),
    new SceneMember(
      diningRoomProperties.kallaxLedRGB.props.g.props.main.props.setState,
      false
    ),
    new SceneMember(
      diningRoomProperties.kallaxLedRGB.props.r.props.brightness.props.setState,
      0.5,
      0
    ),
    new SceneMember(
      diningRoomProperties.kallaxLedSide.props.brightness.props.setState,
      0.5,
      0
    ),
    new SceneMember(
      diningRoomProperties.kallaxLedW.props.main.props.setState,
      false
    ),
    new SceneMember(
      diningRoomProperties.tableLight.props.main.props.setState,
      false
    ),
    new SceneMember(
      hallwayProperties.ceilingLightBack.props.main.props.setState,
      false
    ),
    new SceneMember(
      hallwayProperties.ceilingLightFront.props.main.props.setState,
      false
    ),
    new SceneMember(
      kitchenProperties.ledLeftCWhite.props.main.props.setState,
      false
    ),
    new SceneMember(
      kitchenProperties.ledLeftFloodlight.props.main.props.setState,
      false
    ),
    new SceneMember(
      kitchenProperties.ledLeftWWhite.props.brightness.props.setState,
      0.5,
      0
    ),
    new SceneMember(
      kitchenProperties.ledRightCWhite.props.main.props.setState,
      false
    ),
    new SceneMember(
      kitchenProperties.ledRightFloodlight.props.main.props.setState,
      false
    ),
    new SceneMember(
      kitchenProperties.ledRightWWhite.props.brightness.props.setState,
      0.5,
      0
    ),
    new SceneMember(
      livingRoomProperties.ceilingLight.props.main.props.setState,
      false
    ),
    new SceneMember(
      livingRoomProperties.standingLamp.props.main.props.setState,
      true,
      false
    ),
  ],
  'lighting'
);

export const kitchenAdjacentBright = scene(
  [
    new SceneMember(
      diningRoomProperties.ceilingLight.props.main.props.setState,
      true,
      false
    ),
    new SceneMember(
      diningRoomProperties.kallaxLedRGB.props.b.props.main.props.setState,
      false
    ),
    new SceneMember(
      diningRoomProperties.kallaxLedRGB.props.g.props.main.props.setState,
      false
    ),
    new SceneMember(
      diningRoomProperties.kallaxLedRGB.props.r.props.main.props.setState,
      false
    ),
    new SceneMember(
      diningRoomProperties.kallaxLedSide.props.brightness.props.setState,
      1,
      0
    ),
    new SceneMember(
      diningRoomProperties.kallaxLedW.props.brightness.props.setState,
      1,
      0
    ),
    new SceneMember(
      diningRoomProperties.tableLight.props.main.props.setState,
      true,
      false
    ),
    new SceneMember(
      kitchenProperties.ledLeftCWhite.props.brightness.props.setState,
      1,
      0
    ),
    new SceneMember(
      kitchenProperties.ledLeftFloodlight.props.brightness.props.setState,
      1,
      0
    ),
    new SceneMember(
      kitchenProperties.ledLeftWWhite.props.brightness.props.setState,
      1,
      0
    ),
    new SceneMember(
      kitchenProperties.ledRightCWhite.props.brightness.props.setState,
      1,
      0
    ),
    new SceneMember(
      kitchenProperties.ledRightFloodlight.props.brightness.props.setState,
      1,
      0
    ),
    new SceneMember(
      kitchenProperties.ledRightWWhite.props.brightness.props.setState,
      1,
      0
    ),
    new SceneMember(
      livingRoomProperties.ceilingLight.props.main.props.setState,
      true,
      false
    ),
    new SceneMember(
      livingRoomProperties.standingLamp.props.main.props.setState,
      true,
      false
    ),
  ],
  'lighting'
);

export const allLightsOff = trigger(async () => {
  (await allLights).props.main.props.setState.value = false;
}, 'lighting');

export const allOff = trigger(async () => {
  (await all).props.main.props.setState.value = false;
}, 'scene');
