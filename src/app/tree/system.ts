import { epochs } from '@mrpelz/modifiable-date';

import { makeCustomStringLogger } from '../../lib/log.js';
import { setMain } from '../../lib/tree/logic.js';
import { Level } from '../../lib/tree/main.js';
import { InitFunction } from '../../lib/tree/operations/init.js';
import { makePathStringRetriever } from '../../lib/tree/operations/introspection.js';
import { timer } from '../../lib/tree/properties/logic.js';
import { context } from '../context.js';
import { logger, logicReasoningLevel } from '../logging.js';
import { every5Seconds } from '../timings.js';
import {
  allLights as allLights_,
  allMotion as allMotion_,
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

const firstFloor: {
  $: 'firstFloor';
  hallway: typeof hallway;
  kitchen: typeof kitchen;
  kitchenAdjacentBright: typeof kitchenAdjacentBright;
  kitchenAdjacentChillax: typeof kitchenAdjacentChillax;
  kitchenAdjacentLights: typeof kitchenAdjacentLights;
  level: Level.FLOOR;
  livingRoom: typeof livingRoom;
  mrpelzBathroom: typeof mrpelzBathroom;
  mrpelzBedroom: typeof mrpelzBedroom;
  office: typeof office;
  storageRoom: typeof storageRoom;
  testRoom: typeof testRoom;
  tsiaBathroom: typeof tsiaBathroom;
  tsiaBedroom: typeof tsiaBedroom;
} = {
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

const sonninstraße16: {
  $: 'sonninstraße16';
  entryDoor: typeof hallwayProperties.door;
  firstFloor: typeof firstFloor;
  level: Level.BUILDING;
} & ReturnType<typeof sunElevation> = {
  $: 'sonninstraße16' as const,
  firstFloor,
  // eslint-disable-next-line sort-keys
  entryDoor: hallwayProperties.door,
  level: Level.BUILDING as const,
  ...sunElevation(every5Seconds),
};

export const wurstHome: {
  $: 'wurstHome';
  level: Level.HOME;
  sonninstraße16: typeof sonninstraße16;
} = {
  $: 'wurstHome' as const,
  level: Level.HOME as const,
  sonninstraße16,
};

export const system: Promise<{
  $: 'system';
  $init: InitFunction;
  allLights: Awaited<typeof allLights_>;
  allLightsOff: typeof allLightsOff;
  allMotion: Awaited<typeof allMotion_>;
  allOff: typeof allOff;
  allThings: Awaited<typeof allThings_>;
  allTimer: ReturnType<typeof timer>;
  allWindows: Awaited<typeof allWindows_>;
  level: Level.SYSTEM;
  wurstHome: typeof wurstHome;
}> = (async () => {
  const allLights = await allLights_;
  const allMotion = await allMotion_;
  const allThings = await allThings_;
  const allWindows = await allWindows_;

  const allTimer = timer(context, epochs.day, true);

  const $init: InitFunction = (self, introspection) => {
    const p = makePathStringRetriever(introspection);
    const l = makeCustomStringLogger(
      logger.getInput({
        head: p(self),
      }),
      logicReasoningLevel,
    );

    allThings.main.setState.observe((value, _observer, changed) => {
      if (!value && !changed) return;

      l(
        `${p(allTimer)} was ${value ? 'started' : 'stopped'} because ${p(allThings)} was turned ${value ? 'on' : 'off'}`,
      );

      allTimer.state[value ? 'start' : 'stop']();
    }, true);

    allTimer.state.observe(() =>
      setMain(allThings, false, () =>
        l(`${p(allThings)} was turned off because ${p(allTimer)} ran out`),
      ),
    );
  };

  return {
    $: 'system' as const,
    $init,
    allLights,
    allLightsOff,
    allMotion,
    allOff,
    allThings,
    allTimer,
    allWindows,
    level: Level.SYSTEM as const,
    wurstHome,
  };
})();

export type TSystem = Awaited<typeof system>;
