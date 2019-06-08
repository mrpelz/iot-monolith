function arrayRandom(input) {
  return input[
    Math.floor(Math.random() * input.length)
  ];
}

function arraysToObject(keyArray, valueArray) {
  if (!Array.isArray(keyArray) || !Array.isArray(valueArray)) {
    throw new Error('inputs are not arrays');
  }
  if (keyArray.length !== valueArray.length) {
    throw new Error('array lengths do not match');
  }

  const result = {};

  keyArray.forEach((key, index) => {
    result[key] = valueArray[index];
  });

  return result;
}

function flattenArrays(input, result = []) {
  for (let i = 0; i < input.length; i += 1) {
    const value = input[i];
    if (Array.isArray(value)) {
      flattenArrays(value, result);
    } else {
      result.push(value);
    }
  }
  return result;
}

function flattenData(input, parentKey = null) {
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

function getKey(object, key) {
  if (!object[key]) {
    object[key] = {};
  }

  return object[key];
}

function isObject(input) {
  return (
    input !== null
    && typeof input === 'object'
    && !Array.isArray(input)
  );
}

function includeKeys(object, ...keys) {
  if (!isObject(object)) throw new Error('input is not an object');

  const result = {};

  keys.forEach((key) => {
    const { [key]: value } = object;
    if (!value === undefined) return;

    result[key] = value;
  });

  return result;
}

function excludeKeys(object, ...keys) {
  if (!isObject(object)) throw new Error('input is not an object');

  const result = {};

  Object.keys(object).forEach((key) => {
    if (keys.includes(key)) return;

    const { [key]: value } = object;
    if (!value === undefined) return;

    result[key] = value;
  });

  return result;
}

function findFlattenedDiff(old, current) {
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

function compareObjects(a, b) {
  return findFlattenedDiff(
    flattenData(a),
    flattenData(b)
  );
}

function isPrimitive(input) {
  return Object(input) !== input;
}

function objectFrom(value, ...keys) {
  const result = {};

  keys.forEach((key) => {
    result[key] = value;
  });

  return result;
}

module.exports = {
  arrayRandom,
  arraysToObject,
  compareObjects,
  excludeKeys,
  findFlattenedDiff,
  flattenArrays,
  flattenData,
  isPrimitive,
  getKey,
  includeKeys,
  isObject,
  objectFrom
};