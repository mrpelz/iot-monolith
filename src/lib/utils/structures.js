/**
 * @template T
 * @param {T[]} input
 * @returns {T}
 */
export function arrayRandom(input) {
  return input[Math.floor(Math.random() * input.length)];
}

/**
 * @template T
 * @param {{ [key: string]: T}} object
 * @param {string} key
 * @returns {T}
 */
export function getKey(object, key) {
  if (!object[key]) {
    object[key] = /** @type {T} */ ({});
  }

  return object[key];
}

/**
 * @param {any} input
 * @returns {boolean}
 */
export function isObject(input) {
  return input !== null && typeof input === 'object' && !Array.isArray(input);
}

/**
 * @template T
 * @param {T | any} object
 * @param  {...string} keys
 * @returns {Partial<T>}
 */
export function includeKeys(object, ...keys) {
  if (!isObject(object)) throw new Error('input is not an object');

  const result = {};

  keys.forEach((key) => {
    const { [key]: value } = object;
    if (value === undefined) return;

    result[key] = value;
  });

  return result;
}

/**
 * @template T
 * @param {T | any} object
 * @param  {...string} keys
 * @returns {Partial<T>}
 */
export function excludeKeys(object, ...keys) {
  if (!isObject(object)) throw new Error('input is not an object');

  const result = {};

  Object.keys(object).forEach((key) => {
    if (keys.includes(key)) return;

    const { [key]: value } = object;
    if (value === undefined) return;

    result[key] = value;
  });

  return result;
}
