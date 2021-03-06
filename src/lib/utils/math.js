/* eslint-disable no-bitwise */

export function gammaCorrect(input, range, gamma) {
  // return input;
  if (input === 0) return 0;
  if (input === range) return range;
  if (!gamma) return input * range;
  return ((input / range) ** gamma) * range;
}

export function maxNumber(numbers) {
  if (!numbers.length) return null;

  return numbers.reduce((aggregator, current) => {
    if (aggregator < current) return current;
    return aggregator;
  }, Number.NEGATIVE_INFINITY);
}

// http://www.jstips.co/en/javascript/array-average-and-median/
export function mean(numbers) {
  return numbers.reduce((a, b) => { return a + b; }, 0) / numbers.length;
}

export function median(input) {
  const numbers = input.slice(0);
  numbers.sort((a, b) => { return a - b; });
  return (numbers[(numbers.length - 1) >> 1] + numbers[numbers.length >> 1]) / 2;
}

export function minNumber(numbers) {
  if (!numbers.length) return null;

  return numbers.reduce((aggregator, current) => {
    if (aggregator > current) return current;
    return aggregator;
  }, Number.POSITIVE_INFINITY);
}

export function quotient(dividend, divisor) {
  return Math.floor(dividend / divisor);
}

export function remainder(dividend, divisor) {
  return dividend % divisor;
}

export function trimDecimals(input, decimals = 2) {
  const trimmer = 10 ** decimals;
  return Math.round(input * trimmer) / trimmer;
}

export function sanity(input, options) {
  if (input === null) return null;

  const {
    divide = 1,
    max = Number.POSITIVE_INFINITY,
    min = Number.NEGATIVE_INFINITY,
    multiply = 1,
    offset = 0,
    round = false
  } = options;

  if (input > max) return null;
  if (input < min) return null;

  let value = input;

  value += offset;
  value /= divide;
  value *= multiply;

  if (round !== false) {
    value = trimDecimals(
      value,
      Number.isInteger(round)
        ? round
        : 0
    );
  }

  return value;
}

export const transitions = {
  linear: (t) => { return t; },
  // accelerating from zero velocity
  easeInQuad: (t) => { return t * t; },
  // decelerating to zero velocity
  easeOutQuad: (t) => { return t * (2 - t); },
  // acceleration until halfway, then deceleration
  easeInOutQuad: (t) => {
    return t < 0.5
      ? 2 * t * t
      : -1 + ((4 - (2 * t)) * t);
  },
  // accelerating from zero velocity
  easeInCubic: (t) => { return t * t * t; },
  // decelerating to zero velocity
  easeOutCubic: (t) => {
    const i = t - 1;
    return (i * i * i) + 1;
  },
  // acceleration until halfway, then deceleration
  easeInOutCubic: (t) => {
    return t < 0.5
      ? 4 * t * t * t
      : ((t - 1) * ((2 * t) - 2) * ((2 * t) - 2)) + 1;
  },
  // accelerating from zero velocity
  easeInQuart: (t) => { return t * t * t * t; },
  // decelerating to zero velocity
  easeOutQuart: (t) => {
    const i = t - 1;
    return 1 - (i * i * i * i);
  },
  // acceleration until halfway, then deceleration
  easeInOutQuart: (t) => {
    const i = t - 1;
    return t < 0.5
      ? 8 * t * t * t * t
      : 1 - (8 * i * i * i * i);
  },
  // accelerating from zero velocity
  easeInQuint: (t) => { return t * t * t * t * t; },
  // decelerating to zero velocity
  easeOutQuint: (t) => {
    const i = t - 1;
    return 1 + (i * i * i * i * i);
  },
  // acceleration until halfway, then deceleration
  easeInOutQuint: (t) => {
    const i = t - 1;
    return t < 0.5
      ? 16 * t * t * t * t * t
      : 1 + (16 * i * i * i * i * i);
  }
};

export function ledCalc(
  fromP,
  toP,
  duration = 3000,
  transition = transitions.linear,
  range = 255,
  gamma = 2.8,
  timeStep = 17
) {
  const toPwm = (input) => {
    return Math.round(
      Math.max(
        Math.min(
          gammaCorrect(
            input,
            range,
            gamma
          ),
          range
        ),
        0
      )
    );
  };

  const from = Math.round(fromP * range);
  const to = Math.round(toP * range);

  const distance = to - from;
  if (!distance) return null;

  const target = toPwm(to);

  let timeProgress = timeStep;
  let valueProgress = from;

  const result = [];

  while (timeProgress < duration) {
    const value = toPwm(
      from + (
        transition(
          timeProgress / duration
        ) * distance
      )
    );

    if (Math.abs(value - valueProgress) >= 1) {
      valueProgress = value;

      result.push({
        time: timeProgress,
        value
      });
    }

    timeProgress += timeStep;
  }

  if (!result.length) {
    result.push({
      time: duration,
      value: target
    });
  }

  return result;
}
