/* eslint-disable @typescript-eslint/ban-ts-comment */
import { match } from '../../lib/tree/main.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
import { properties as diningRoomProperties } from './rooms/dining-room.js';
import { properties as hallwayProperties } from './rooms/hallway.js';
import { properties as kitchenProperties } from './rooms/kitchen.js';
import { properties as livingRoomProperties } from './rooms/living-room.js';

export const all = (async () => {
  const { wurstHome } = await import('./system.js');

  return outputGrouping(
    [
      match({ $: 'output' as const }, wurstHome),
      match({ $: 'led' as const }, wurstHome),
    ].flat(1),
    'group',
  );
})();

export const allLights = (async () => {
  const { wurstHome } = await import('./system.js');

  return outputGrouping(
    [
      match(
        {
          $: 'output' as const,
          topic: 'lighting' as const,
        },
        wurstHome,
      ),
      match({ $: 'led' as const }, wurstHome),
    ].flat(1),
  );
})();

export const kitchenAdjacentLights = outputGrouping([
  diningRoomProperties.ceilingLight,
  diningRoomProperties.kallaxLedRGB.b,
  diningRoomProperties.kallaxLedRGB.g,
  diningRoomProperties.kallaxLedRGB.r,
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
  livingRoomProperties.standingLamp,
  livingRoomProperties.terrariumLedRed,
  livingRoomProperties.terrariumLedTop,
]);
