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
