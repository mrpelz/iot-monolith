/* eslint-disable sort-keys */
import { isPlainObject } from '@mrpelz/misc-utils/oop';
import { DoubleLE, MappedStruct, TStruct, UIntLE } from '@mrpelz/struct';

import { Service } from '../device/main.js';
import {
  BLINK_PERIOD_OFF,
  BLINK_PERIOD_ON,
  ITERATE_INFINITE,
  request,
} from './output-ng-binary.js';
import { RAMP_TIME } from './output-ng-dimmable.js';

const sequenceItemRequest = new MappedStruct({
  holdTime: new UIntLE(4),
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  value: new MappedStruct({
    rampTime: new UIntLE(4),
    r: new DoubleLE(),
    g: new DoubleLE(),
    b: new DoubleLE(),
  }),
});

export type OutputDimmableRGBSequenceItemRequest = TStruct<
  typeof sequenceItemRequest
>;

export type OutputDimmableRGBRequest = {
  iterations: typeof request.value.iterations;
  sequence: OutputDimmableRGBSequenceItemRequest[];
};

export class OutputDimmableRGB extends Service<null, OutputDimmableRGBRequest> {
  constructor(index: number) {
    super(Buffer.from([0x0f, index]));
  }

  protected encode({ iterations, sequence }: OutputDimmableRGBRequest): Buffer {
    const sequenceRequest = Buffer.concat(
      sequence.map((item) => sequenceItemRequest.encode(item)),
      sequenceItemRequest.size * sequence.length,
    );

    const result = request.encode({
      iterations,
      sequence: sequenceRequest,
    });

    return result;
  }
}

export const on = (): OutputDimmableRGBRequest => ({
  iterations: 1,
  sequence: [
    {
      holdTime: 0,
      value: { rampTime: 0, b: 1, g: 1, r: 1 },
    },
  ],
});

export const off = (): OutputDimmableRGBRequest => ({
  iterations: 1,
  sequence: [
    {
      holdTime: 0,
      value: { rampTime: 0, b: 0, g: 0, r: 0 },
    },
  ],
});

export const setR = (): OutputDimmableRGBRequest => ({
  iterations: 1,
  sequence: [
    {
      holdTime: 0,
      value: { rampTime: 0, b: 0, g: 0, r: 1 },
    },
  ],
});

export const setG = (): OutputDimmableRGBRequest => ({
  iterations: 1,
  sequence: [
    {
      holdTime: 0,
      value: { rampTime: 0, b: 0, g: 1, r: 0 },
    },
  ],
});

export const setB = (): OutputDimmableRGBRequest => ({
  iterations: 1,
  sequence: [
    {
      holdTime: 0,
      value: { rampTime: 0, b: 1, g: 0, r: 0 },
    },
  ],
});

export type RGB = {
  b: number;
  g: number;
  r: number;
};

export const isRGB = (value: unknown): value is RGB => {
  if (!isPlainObject(value)) return false;
  if (!('r' in value) || !('g' in value) || !('b' in value)) return false;
  if (
    typeof value.r !== 'number' ||
    typeof value.g !== 'number' ||
    typeof value.b !== 'number'
  ) {
    return false;
  }

  return true;
};

export const setRGB = (
  { b, g, r }: RGB,
  rampTime = RAMP_TIME,
): OutputDimmableRGBRequest => ({
  iterations: 1,
  sequence: [{ holdTime: 0, value: { rampTime, b, g, r } }],
});

export const brightness = (
  value: number,
  rampTime = RAMP_TIME,
): OutputDimmableRGBRequest => ({
  iterations: 1,
  sequence: [
    {
      holdTime: 0,
      value: { rampTime, b: value, g: value, r: value },
    },
  ],
});

export const blink = (
  count = ITERATE_INFINITE,
  timeOn = BLINK_PERIOD_ON,
  timeOff = BLINK_PERIOD_OFF,
  rampTime = RAMP_TIME,
): OutputDimmableRGBRequest => ({
  iterations: count,
  sequence: [
    {
      holdTime: timeOn + rampTime,
      value: { rampTime, b: 1, g: 1, r: 1 },
    },
    {
      holdTime: timeOff + rampTime,
      value: { rampTime, b: 0, g: 0, r: 0 },
    },
  ],
});

export const blinkR = (
  count = ITERATE_INFINITE,
  timeOn = BLINK_PERIOD_ON,
  timeOff = BLINK_PERIOD_OFF,
  rampTime = RAMP_TIME,
): OutputDimmableRGBRequest => ({
  iterations: count,
  sequence: [
    {
      holdTime: timeOn + rampTime,
      value: { rampTime, b: 0, g: 0, r: 1 },
    },
    {
      holdTime: timeOff + rampTime,
      value: { rampTime, b: 0, g: 0, r: 0 },
    },
  ],
});

export const blinkG = (
  count = ITERATE_INFINITE,
  timeOn = BLINK_PERIOD_ON,
  timeOff = BLINK_PERIOD_OFF,
  rampTime = RAMP_TIME,
): OutputDimmableRGBRequest => ({
  iterations: count,
  sequence: [
    {
      holdTime: timeOn + rampTime,
      value: { rampTime, b: 0, g: 1, r: 0 },
    },
    {
      holdTime: timeOff + rampTime,
      value: { rampTime, b: 0, g: 0, r: 0 },
    },
  ],
});

export const blinkB = (
  count = ITERATE_INFINITE,
  timeOn = BLINK_PERIOD_ON,
  timeOff = BLINK_PERIOD_OFF,
  rampTime = RAMP_TIME,
): OutputDimmableRGBRequest => ({
  iterations: count,
  sequence: [
    {
      holdTime: timeOn + rampTime,
      value: { rampTime, b: 1, g: 0, r: 0 },
    },
    {
      holdTime: timeOff + rampTime,
      value: { rampTime, b: 0, g: 0, r: 0 },
    },
  ],
});

export const blinkRGB = (
  count = ITERATE_INFINITE,
  timeOn = BLINK_PERIOD_ON,
  timeOff = BLINK_PERIOD_OFF,
  rampTime = RAMP_TIME,
): OutputDimmableRGBRequest => ({
  iterations: count,
  sequence: [
    {
      holdTime: timeOn + rampTime,
      value: { rampTime, b: 0, g: 0, r: 1 },
    },
    {
      holdTime: timeOff + rampTime,
      value: { rampTime, b: 0, g: 0, r: 0 },
    },
    {
      holdTime: timeOn + rampTime,
      value: { rampTime, b: 0, g: 1, r: 0 },
    },
    {
      holdTime: timeOff + rampTime,
      value: { rampTime, b: 0, g: 0, r: 0 },
    },
    {
      holdTime: timeOn + rampTime,
      value: { rampTime, b: 1, g: 0, r: 0 },
    },
    {
      holdTime: timeOff + rampTime,
      value: { rampTime, b: 0, g: 0, r: 0 },
    },
  ],
});

export const blinkRGBInclusive = (
  count = ITERATE_INFINITE,
  timeOn = BLINK_PERIOD_ON,
  rampTime = RAMP_TIME,
): OutputDimmableRGBRequest => ({
  iterations: count,
  sequence: [
    {
      holdTime: timeOn + rampTime,
      value: { rampTime, b: 0, g: 0, r: 1 },
    },
    {
      holdTime: timeOn + rampTime,
      value: { rampTime, b: 0, g: 1, r: 0 },
    },
    {
      holdTime: timeOn + rampTime,
      value: { rampTime, b: 1, g: 0, r: 0 },
    },
  ],
});
