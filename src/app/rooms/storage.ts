/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree.js';
import { rfBridge } from '../bridges.js';

export function storage() {
  const result = {
    rfBridge,
  };

  metadataStore.set(result, {
    level: Levels.ROOM,
    name: 'storage',
  });

  return result;
}
