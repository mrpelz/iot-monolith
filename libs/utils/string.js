function camel(...input) {
  return input.map((word, index) => {
    const tile = word.toString();

    if (!index) {
      return tile;
    }

    const first = tile.charAt(0).toUpperCase();
    const rest = tile.slice(1);
    return `${first}${rest}`;
  }).join('');
}

function pascal(...input) {
  return input.map((word) => {
    const tile = word.toString();

    const first = tile.charAt(0).toUpperCase();
    const rest = tile.slice(1);
    return `${first}${rest}`;
  }).join('');
}

function scope(...input) {
  return input.join('.');
}

function words(input) {
  return input.trim().split(/\s+/);
}

module.exports = {
  camel,
  pascal,
  scope,
  words
};
