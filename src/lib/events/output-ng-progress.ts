import { Bool, MappedStruct, TStruct, UIntLE } from '@mrpelz/struct';

import { Event } from '../device/main.js';

const payloadStageOne = new MappedStruct({
  isIterating: new Bool(),
});

const payloadStageTwo = new MappedStruct({
  remainingIterations: new UIntLE(4),
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export type OutputProgressPayload = TStruct<typeof payloadStageOne> &
  Partial<TStruct<typeof payloadStageTwo>>;

class OutputProgress extends Event<OutputProgressPayload> {
  protected decode(input: Buffer): OutputProgressPayload | null {
    try {
      const [{ isIterating }, rest] = payloadStageOne.decodeOpenended(input);
      const { remainingIterations } =
        rest.length > 0 ? payloadStageTwo.decode(rest) : {};

      return { isIterating, remainingIterations };
    } catch {
      return null;
    }
  }
}

export type TOutputProgress = OutputProgress;

export class OutputBinaryProgress extends OutputProgress {
  constructor(index: number) {
    super(Buffer.from([0x0c, index]));
  }
}

export class OutputBuzzerProgress extends OutputProgress {
  constructor(index: number) {
    super(Buffer.from([0x0d, index]));
  }
}

export class OutputDimmableProgress extends OutputProgress {
  constructor(index: number) {
    super(Buffer.from([0x0e, index]));
  }
}

export class OutputDimmableRGBProgress extends OutputProgress {
  constructor(index: number) {
    super(Buffer.from([0x0f, index]));
  }
}
