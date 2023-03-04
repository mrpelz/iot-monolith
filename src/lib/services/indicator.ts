/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable sort-keys */

import { MappedStruct, TStruct, UInt8 } from '../struct/main.js';
import { Service } from '../device/main.js';

export enum IndicatorMode {
  OFF,
  ON,
  BLINK,
}

const request = new MappedStruct({
  mode: new UInt8<IndicatorMode>(),
  blink: new UInt8(),
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export type IndicatorRequest = TStruct<typeof request>;

export class Indicator extends Service<null, IndicatorRequest> {
  constructor(index: number) {
    super(Buffer.from([0xc0, index]));
  }

  protected encode(input: IndicatorRequest): Buffer {
    return request.encode(input);
  }
}
