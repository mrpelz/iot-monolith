export function maxmin(input: number, max = 1, min = 0): number {
  return Math.max(Math.min(input, max), min);
}

export function gammaCorrect(
  input: number,
  range: number,
  gamma = 3.6
): number {
  if (input === 0) return 0;
  if (input === range) return range;
  return maxmin(Math.round((input / range) ** gamma * range), range);
}
