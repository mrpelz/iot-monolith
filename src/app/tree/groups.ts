import { excludePattern, match } from '../../lib/tree/main.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
import { context } from '../context.js';
import { properties as hallwayProperties } from './rooms/hallway.js';
import { properties as kitchenProperties } from './rooms/kitchen.js';
import { properties as livingRoomProperties } from './rooms/living-room.js';
import { properties as officeProperties } from './rooms/office.js';

export const all = (async () => {
  const { wurstHome } = await import('./system.js');

  return outputGrouping(
    context,
    [
      match({ $: 'output' as const }, excludePattern, wurstHome),
      match({ $: 'led' as const }, excludePattern, wurstHome),
    ].flat(1),
    'group',
  );
})();

export const allLights = (async () => {
  const { wurstHome } = await import('./system.js');

  return outputGrouping(
    context,
    [
      match(
        {
          $: 'output' as const,
          topic: 'lighting' as const,
        },
        excludePattern,
        wurstHome,
      ),
      match({ $: 'led' as const }, excludePattern, wurstHome),
    ].flat(1),
  );
})();

export const kitchenAdjacentLights = outputGrouping(context, [
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
  livingRoomProperties.terrariumLedRed,
  livingRoomProperties.terrariumLedTop,
]);
