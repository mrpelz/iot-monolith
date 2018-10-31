/* eslint-disable no-bitwise */

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

module.exports = {
  maxNumber,
  mean,
  median,
  minNumber,
  quotient,
  remainder,
  sanity,
  trimDecimals
};
