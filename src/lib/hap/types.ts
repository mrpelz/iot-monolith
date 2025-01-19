import type { Characteristic, Service } from 'hap-nodejs';

import type { Constructor } from '../oop.js';

export type TCharacteristicKey = keyof {
  [K in keyof typeof Characteristic as (typeof Characteristic)[K] extends Constructor<Characteristic>
    ? K
    : never]: true;
};

export type TServiceKey = keyof {
  [K in keyof typeof Service as (typeof Service)[K] extends Constructor<Service>
    ? K
    : never]: true;
};
