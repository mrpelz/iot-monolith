function camel(...input) {
  return input.map((tile, index) => {
    if (!index) {
      return tile;
    }

    const first = tile.charAt(0).toUpperCase();
    const rest = tile.slice(1);
    return `${first}${rest}`;
  }).join('');
}

function leftPad(input, pad = '') {
  return `${pad}${input}`.slice(-pad.length);
}

function pascal(...input) {
  return input.map((tile) => {
    const first = tile.charAt(0).toUpperCase();
    const rest = tile.slice(1);
    return `${first}${rest}`;
  }).join('');
}

function scope(...input) {
  return input.join('.');
}

module.exports = {
  camel,
  leftPad,
  pascal,
  scope
};
