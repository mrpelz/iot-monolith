/* eslint-disable no-bitwise */

// http://www.jstips.co/en/javascript/array-average-and-median/
function average(...numbers) {
  return numbers.reduce((a, b) => { return a + b; }, 0) / numbers.length;
}

function median(...numbers) {
  numbers.sort((a, b) => { return a - b; });
  return (numbers[(numbers.length - 1) >> 1] + numbers[numbers.length >> 1]) / 2;
}

module.exports = {
  average,
  median
};
