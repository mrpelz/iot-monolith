/* eslint-disable sort-keys */
import { MappedStruct, TStruct, UIntLE } from '@mrpelz/struct';

import { Service } from '../device/main.js';
import { ITERATE_INFINITE, request } from './output-ng-binary.js';

const sequenceItemRequest = new MappedStruct({
  holdTime: new UIntLE(4),
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  value: new MappedStruct({
    rampTime: new UIntLE(4),
    value: new UIntLE(4),
  }),
});

export type OutputBuzzerSequenceItemRequest = TStruct<
  typeof sequenceItemRequest
>;

export type OutputBuzzerRequest = {
  iterations: typeof request.value.iterations;
  sequence: OutputBuzzerSequenceItemRequest[];
};

export class OutputBuzzer extends Service<null, OutputBuzzerRequest> {
  constructor(index: number) {
    super(Buffer.from([0x0d, index]));
  }

  protected encode({ iterations, sequence }: OutputBuzzerRequest): Buffer {
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

export const tone = (frequency: number): OutputBuzzerRequest => ({
  iterations: 1,
  sequence: [
    {
      holdTime: 0,
      value: { rampTime: 0, value: frequency },
    },
  ],
});

export const BUZZER_DEFAULT_FREQUENCY = 3750;
export const BUZZER_DEFAULT_HOLD_TIME = 125;
export const BUZZER_DEFAULT_PAUSE_TIME = 375;

export const buzzerNotes = {
  defaultFrequency: BUZZER_DEFAULT_FREQUENCY,
  cFrequency: 4186,
  cSharpFrequency: 4435,
  dFrequency: 4699,
  eFlatFrequency: 4978,
  eFrequency: 5274,
  fFrequency: 5588,
  fSharpFrequency: 5920,
  gFrequency: 6272,
  gSharpFrequency: 6645,
  aFrequency: 7040,
  bFlatFrequency: 7459,
  bFrequency: 7902,
};

export const beep = (
  count = ITERATE_INFINITE,
  frequency = BUZZER_DEFAULT_FREQUENCY,
  holdTime = BUZZER_DEFAULT_HOLD_TIME,
  pauseTime = BUZZER_DEFAULT_PAUSE_TIME,
): OutputBuzzerRequest => ({
  iterations: count,
  sequence: [
    {
      holdTime,
      value: { rampTime: 0, value: frequency },
    },
    {
      holdTime: pauseTime,
      value: { rampTime: 0, value: 0 },
    },
  ],
});

export const melody = (
  melody_: number[],
  count = 1,
  holdTime = BUZZER_DEFAULT_HOLD_TIME,
  pauseTime = BUZZER_DEFAULT_PAUSE_TIME,
): OutputBuzzerRequest => {
  const sequence: OutputBuzzerSequenceItemRequest[] = [];

  for (const item of melody_) {
    if (holdTime) {
      sequence.push({ holdTime, value: { rampTime: 0, value: item } });
    }

    sequence.push({ holdTime: pauseTime, value: { rampTime: 0, value: 0 } });
  }

  return {
    iterations: count,
    sequence,
  };
};

export const alleMeineEntchen = melody([
  buzzerNotes.cFrequency,
  buzzerNotes.dFrequency,
  buzzerNotes.eFrequency,
  buzzerNotes.fFrequency,
  buzzerNotes.gFrequency,
  0,
  buzzerNotes.gFrequency,
  0,
  buzzerNotes.eFrequency,
  buzzerNotes.eFrequency,
  buzzerNotes.eFrequency,
  buzzerNotes.eFrequency,
  buzzerNotes.gFrequency,
  0,
  buzzerNotes.eFrequency,
  buzzerNotes.eFrequency,
  buzzerNotes.eFrequency,
  buzzerNotes.eFrequency,
  buzzerNotes.gFrequency,
  0,
  buzzerNotes.fFrequency,
  buzzerNotes.fFrequency,
  buzzerNotes.fFrequency,
  buzzerNotes.fFrequency,
  buzzerNotes.eFrequency,
  0,
  buzzerNotes.eFrequency,
  0,
  buzzerNotes.dFrequency,
  buzzerNotes.dFrequency,
  buzzerNotes.dFrequency,
  buzzerNotes.dFrequency,
  buzzerNotes.cFrequency,
]);
