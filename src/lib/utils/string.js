export function camel(...input) {
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

export function pascal(...input) {
  return input.map((word) => {
    const tile = word.toString();

    const first = tile.charAt(0).toUpperCase();
    const rest = tile.slice(1);
    return `${first}${rest}`;
  }).join('');
}

export function scope(...input) {
  return input.join('.');
}

export function words(input) {
  return input.trim().split(/\s+/);
}

export function parseString(input) {
  if (input === 'true') return true;
  if (input === 'false') return false;

  const number = Number(input);
  if (!Number.isNaN(number) && !Array.isArray(input)) return number;

  return input;
}
