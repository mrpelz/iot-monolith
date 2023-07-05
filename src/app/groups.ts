import { properties as diningRoomProperties } from './rooms/dining-room.js';
import { properties as hallwayProperties } from './rooms/hallway.js';
import { properties as kitchenProperties } from './rooms/kitchen.js';
import { properties as livingRoomProperties } from './rooms/living-room.js';
import { outputGrouping } from '../lib/tree/properties/actuators.js';

export const all = (async () => {
  const { wurstHome } = await import('./system.js');

  return outputGrouping(
    [
      wurstHome.matchChildrenDeep({ $: 'output' as const }),
      wurstHome.matchChildrenDeep({ $: 'led' as const }),
    ].flat(1),
    'group'
  );
})();

export const allLights = (async () => {
  const { wurstHome } = await import('./system.js');

  return outputGrouping(
    [
      wurstHome.matchChildrenDeep({
        $: 'output' as const,
        topic: 'lighting' as const,
      }),
      wurstHome.matchChildrenDeep({ $: 'led' as const }),
    ].flat(1)
  );
})();

export const kitchenAdjacentLights = outputGrouping([
  diningRoomProperties.ceilingLight,
  diningRoomProperties.kallaxLedRGB.props.b,
  diningRoomProperties.kallaxLedRGB.props.g,
  diningRoomProperties.kallaxLedRGB.props.r,
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
