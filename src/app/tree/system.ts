import { epochs } from '../../lib/epochs.js';
import { Level } from '../../lib/tree/main.js';
import { offTimer } from '../../lib/tree/properties/logic.js';
import { context } from '../context.js';
import { every5Seconds } from '../timings.js';
import {
  allLights as allLights_,
  allThings as allThings_,
  allWindows as allWindows_,
  kitchenAdjacentLights,
} from './groups.js';
import { sunElevation } from './misc.js';
import { hallway, properties as hallwayProperties } from './rooms/hallway.js';
import { kitchen } from './rooms/kitchen.js';
import { livingRoom } from './rooms/living-room.js';
import { mrpelzBathroom } from './rooms/mrpelz-bathroom.js';
import { mrpelzBedroom } from './rooms/mrpelz-bedroom.js';
import { office } from './rooms/office.js';
import { storageRoom } from './rooms/storage-room.js';
import { testRoom } from './rooms/test-room.js';
import { tsiaBathroom } from './rooms/tsia-bathroom.js';
import { tsiaBedroom } from './rooms/tsia-bedroom.js';
import {
  allLightsOff,
  allOff,
  kitchenAdjacentBright,
  kitchenAdjacentChillax,
} from './scenes.js';

const firstFloor = {
  $: 'firstFloor' as const,
  hallway,
  kitchen,
  kitchenAdjacentBright,
  kitchenAdjacentChillax,
  kitchenAdjacentLights,
  level: Level.FLOOR as const,
  livingRoom,
  mrpelzBathroom,
  mrpelzBedroom,
  office,
  storageRoom,
  testRoom,
  tsiaBathroom,
  tsiaBedroom,
};

const sonninstraße16 = {
  $: 'sonninstraße16' as const,
  firstFloor,
  // eslint-disable-next-line sort-keys
  entryDoor: hallwayProperties.entryDoor,
  level: Level.BUILDING as const,
  ...sunElevation(every5Seconds),
};

export const wurstHome = {
  $: 'wurstHome' as const,
  level: Level.HOME as const,
  sonninstraße16,
};

export const system = (async () => {
  const allThings = await allThings_;
  const allLights = await allLights_;
  const allWindows = await allWindows_;

  const allTimer = offTimer(context, epochs.day, true);

  return {
    $: 'system' as const,
    $init: () => {
      allThings.main.setState.observe((value) => {
        allTimer.active.state.value = value;
      }, true);

      allTimer.state.observe(() => {
        allThings.main.setState.value = false;
      });
    },
    allLights,
    allLightsOff,
    allOff,
    allThings,
    allTimer,
    allWindows,
    level: Level.SYSTEM as const,
    wurstHome,
  };
})();

export type TSystem = Awaited<typeof system>;
