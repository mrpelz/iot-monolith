import { output } from '../../lib/hap/actuators.js';
import { match } from '../../lib/tree/main.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
import { hap } from '../hap.js';
import { properties as hallwayProperties } from './rooms/hallway.js';
import { properties as kitchenProperties } from './rooms/kitchen.js';
import { properties as livingRoomProperties } from './rooms/living-room.js';
import { properties as officeProperties } from './rooms/office.js';

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

(async () => {
  hap.addAccessories(
    {
      displayName: 'All',
      id: 'groups.all',
      services: [output('all', 'All', await all)],
    },
    {
      displayName: 'All Lights',
      id: 'groups.all.lights',
      services: [output('all.lights', 'All Lights', await allLights)],
    },
    {
      displayName: 'Kitchen Adjacent Lights',
      id: 'groups.kitchenAdjacent.lights',
      services: [
        output(
          'kitchenAdjacent.lights',
          'Kitchen Adjacent Lights',
          kitchenAdjacentLights,
        ),
      ],
    },
  );
})();
