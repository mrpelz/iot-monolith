/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Element, Level, init } from '../../lib/tree/main.js';
import { all as _all, allLights, kitchenAdjacentLights } from './groups.js';
import {
  allLightsOff,
  allOff,
  kitchenAdjacentBright,
  kitchenAdjacentChillax,
} from './scenes.js';
import { hallway, properties as hallwayProperties } from './rooms/hallway.js';
import { diningRoom } from './rooms/dining-room.js';
import { epochs } from '../../lib/epochs.js';
import { every5Seconds } from '../timings.js';
import { kitchen } from './rooms/kitchen.js';
import { livingRoom } from './rooms/living-room.js';
import { mrpelzBathroom } from './rooms/mrpelz-bathroom.js';
import { mrpelzBedroom } from './rooms/mrpelz-bedroom.js';
import { offTimer } from '../../lib/tree/properties/logic.js';
import { persistence } from '../persistence.js';
import { storageRoom } from './rooms/storage-room.js';
import { sunElevation } from './misc.js';
import { testRoom } from './rooms/test-room.js';
import { tsiaBathroom } from './rooms/tsia-bathroom.js';
import { tsiaBedroom } from './rooms/tsia-bedroom.js';

const firstFloor = new Element({
  $: 'firstFloor' as const,
  diningRoom,
  hallway,
  kitchen,
  kitchenAdjacentBright,
  kitchenAdjacentChillax,
  kitchenAdjacentLights,
  level: Level.FLOOR as const,
  livingRoom,
  mrpelzBathroom,
  mrpelzBedroom,
  storageRoom,
  testRoom,
  tsiaBathroom,
  tsiaBedroom,
});

const sonninstraße16 = new Element({
  $: 'sonninstraße16' as const,
  ...sunElevation(every5Seconds),
  firstFloor,
  // eslint-disable-next-line sort-keys
  entryDoor: hallwayProperties.door,
  level: Level.BUILDING as const,
});

export const wurstHome = new Element({
  $: 'wurstHome' as const,
  level: Level.HOME as const,
  sonninstraße16,
});

export const system = (async () => {
  const all = await _all;

  const allTimer = offTimer(epochs.day, true, ['system/allTimer', persistence]);

  return new Element({
    $: 'system' as const,
    all,
    allLights,
    allLightsOff,
    allOff,
    allTimer,
    level: Level.SYSTEM as const,
    wurstHome,
    ...init(() => {
      all.props.main.props.setState.observe((value) => {
        allTimer.props.active.props.state.value = value;
      }, true);

      allTimer.props.state.observe(() => {
        all.props.main.props.setState.value = false;
      });
    }),
  });
})();
