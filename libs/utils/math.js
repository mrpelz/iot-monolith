/* eslint-disable no-bitwise */

// http://www.jstips.co/en/javascript/array-average-and-median/
function average(...numbers) {
  return numbers.reduce((a, b) => { return a + b; }, 0) / numbers.length;
}

function median(...numbers) {
  numbers.sort((a, b) => { return a - b; });
  return (numbers[(numbers.length - 1) >> 1] + numbers[numbers.length >> 1]) / 2;
}

function remainder(dividend, divisor) {
  return dividend % divisor;
}

function trimDecimals(input, decimals = 2) {
  const trimmer = 10 ** decimals;
  return Math.round(input * trimmer) / trimmer;
}

function quotient(dividend, divisor) {
  return Math.floor(dividend, divisor);
}

module.exports = {
  average,
  median,
  remainder,
  trimDecimals,
  quotient
};
