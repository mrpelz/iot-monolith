import { Service } from '../device/main.js';

export enum IndicatorMode {
  OFF,
  ON,
  BLINK,
}

export type IndicatorRequest = {
  blink?: number;
  mode: IndicatorMode;
};

export class Indicator extends Service<null, IndicatorRequest> {
  constructor(index: number) {
    super(Buffer.from([0xc0 + index]));
  }

  protected encode(input: IndicatorRequest): Buffer {
    const { blink, mode } = input;
    const request = Buffer.from([mode]);

    if (mode !== IndicatorMode.BLINK || !blink) return request;
    return Buffer.concat([request, Buffer.from([blink])]);
  }
}
