export const bitRange = (count: number): number => 2 ** count - 1;

export const byteRange = (count: number): number => bitRange(count * 8);

export const bytesRequiredForBitLength = (count: number): number =>
  Math.ceil(count / 8);

/* eslint-disable @typescript-eslint/naming-convention */
export const NUMBER_RANGES = {
  int: {
    1: [-bitRange(7), bitRange(7)],
    2: [-bitRange(15), bitRange(15)],
    3: [-bitRange(23), bitRange(23)],
    4: [-bitRange(31), bitRange(31)],
    5: [-bitRange(39), bitRange(39)],
    6: [-bitRange(47), bitRange(47)],
  },
  uint: {
    1: [0, bitRange(8)],
    2: [0, bitRange(16)],
    3: [0, bitRange(24)],
    4: [0, bitRange(32)],
    5: [0, bitRange(40)],
    6: [0, bitRange(48)],
  },
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

export const maxmin = (input: number, max = 1, min = 0): number =>
  Math.max(Math.min(input, max), min);

export const gammaCorrect = (
  input: number,
  range: number,
  gamma = 3.6
): number => {
  if (input === 0) return 0;
  if (input === range) return range;
  return maxmin(Math.round((input / range) ** gamma * range), range);
};
