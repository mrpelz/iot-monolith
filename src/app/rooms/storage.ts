/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree.js';
import { Logger } from '../../lib/log.js';
import { rfBridge } from '../bridges.js';
import { shelly1 } from '../../lib/groupings/shelly1.js';
import { timings } from '../timings.js';

export function storage(logger: Logger) {
  const nodes = {
    ceilingLight: shelly1(
      logger,
      timings,
      'storage-ceilinglight.iot.wurstsalat.cloud'
    ),
    rfBridge,
  };

  nodes.ceilingLight.button.$.shortPress(() =>
    nodes.ceilingLight.relay.flip._set.trigger()
  );

  const result = {
    ...nodes,
  };

  metadataStore.set(result, {
    level: Levels.ROOM,
    name: 'storage',
  });

  return result;
}
