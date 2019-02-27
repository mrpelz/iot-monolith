/* eslint-disable no-bitwise */

function gammaCorrect(input, gamma = 2.8) {
  if (input === 0) return 0;
  if (input === 1) return 1;
  return input ** gamma;
}

function maxNumber(numbers) {
  if (!numbers.length) return null;

  return numbers.reduce((aggregator, current) => {
    if (aggregator < current) return current;
    return aggregator;
  }, Number.NEGATIVE_INFINITY);
}

// http://www.jstips.co/en/javascript/array-average-and-median/
function mean(numbers) {
  return numbers.reduce((a, b) => { return a + b; }, 0) / numbers.length;
}

function median(input) {
  const numbers = input.slice(0);
  numbers.sort((a, b) => { return a - b; });
  return (numbers[(numbers.length - 1) >> 1] + numbers[numbers.length >> 1]) / 2;
}

function minNumber(numbers) {
  if (!numbers.length) return null;

  return numbers.reduce((aggregator, current) => {
    if (aggregator > current) return current;
    return aggregator;
  }, Number.POSITIVE_INFINITY);
}

function quotient(dividend, divisor) {
  return Math.floor(dividend, divisor);
}

function remainder(dividend, divisor) {
  return dividend % divisor;
}

function trimDecimals(input, decimals = 2) {
  const trimmer = 10 ** decimals;
  return Math.round(input * trimmer) / trimmer;
}

function sanity(input, options) {
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

const transitions = {
  linear: (t) => { return t; },
  // accelerating from zero velocity
  easeInQuad: (t) => { return t * t; },
  // decelerating to zero velocity
  easeOutQuad: (t) => { return t * (2 - t); },
  // acceleration until halfway, then deceleration
  easeInOutQuad: (t) => { return t < 0.5 ? 2 * t * t : -1 + ((4 - (2 * t)) * t); },
  // accelerating from zero velocity
  easeInCubic: (t) => { return t * t * t; },
  // decelerating to zero velocity
  easeOutCubic: (t) => { const i = t - 1; return (i * i * i) + 1; },
  // acceleration until halfway, then deceleration
  easeInOutCubic: (t) => {
    return t < 0.5 ? 4 * t * t * t : ((t - 1) * ((2 * t) - 2) * ((2 * t) - 2)) + 1;
  },
  // accelerating from zero velocity
  easeInQuart: (t) => { return t * t * t * t; },
  // decelerating to zero velocity
  easeOutQuart: (t) => { const i = t - 1; return 1 - (i * i * i * i); },
  // acceleration until halfway, then deceleration
  easeInOutQuart: (t) => {
    const i = t - 1;
    return t < 0.5 ? 8 * t * t * t * t : 1 - (8 * i * i * i * i);
  },
  // accelerating from zero velocity
  easeInQuint: (t) => { return t * t * t * t * t; },
  // decelerating to zero velocity
  easeOutQuint: (t) => { const i = t - 1; return 1 + (i * t * t * t * t); },
  // acceleration until halfway, then deceleration
  easeInOutQuint: (t) => {
    const i = t - 1;
    return t < 0.5 ? 16 * t * t * t * t * t : 1 + (16 * i * i * i * i * i);
  }
};

function ledCalc(
  from,
  to,
  transition = transitions.linear,
  gamma = gammaCorrect
) {
  let value = from;
  let progress = 0;
  while (value < to) {
    value = gamma(transition(progress));
    progress += 0.001;
  }

  return Math.min(progress, 1);
}

module.exports = {
  gammaCorrect,
  ledCalc,
  maxNumber,
  mean,
  median,
  minNumber,
  quotient,
  remainder,
  sanity,
  transitions,
  trimDecimals
};
