export function arrayRandom(input) {
  return input[
    Math.floor(Math.random() * input.length)
  ];
}

export function flattenData(input, parentKey = null) {
  if (
    !input
    || typeof input !== 'object'
  ) {
    return parentKey ? {
      [parentKey]: input
    } : input;
  }

  const result = {};

  if (Array.isArray(input)) {
    input.forEach((value, index) => {
      const chainKey = `${parentKey || ''}[${index}]`;

      Object.assign(result, flattenData(value, chainKey));
    });
  } else {
    Object.keys(input).sort().forEach((key) => {
      const value = input[key];
      const chainKey = parentKey ? `${parentKey}.${key}` : key;

      Object.assign(result, flattenData(value, chainKey));
    });
  }

  return result;
}

export function getKey(object, key) {
  if (!object[key]) {
    object[key] = {};
  }

  return object[key];
}

export function isObject(input) {
  return (
    input !== null
    && typeof input === 'object'
    && !Array.isArray(input)
  );
}

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

export function findFlattenedDiff(old, current) {
  if (!isObject(old)) {
    throw new Error('input "a" is not an object');
  }

  if (!isObject(current)) {
    throw new Error('input "b" is not an object');
  }

  const keys = [
    ...new Set(
      [
        ...Object.keys(old),
        ...Object.keys(current)
      ]
    )
  ];

  const result = {};

  keys.filter((key) => {
    const { [key]: valueA } = old;
    const { [key]: valueB } = current;

    return valueA !== valueB;
  }).forEach((key) => {
    const { [key]: valueA } = old;
    const { [key]: valueB } = current;

    result[key] = {
      old: valueA,
      current: valueB,
      created: valueA === undefined,
      deleted: valueB === undefined
    };
  });

  return result;
}

export function compareObjects(a, b) {
  return findFlattenedDiff(
    flattenData(a),
    flattenData(b)
  );
}

export function isPrimitive(input) {
  return Object(input) !== input;
}

export function objectFrom(value, ...keys) {
  const result = {};

  keys.forEach((key) => {
    result[key] = value;
  });

  return result;
}
