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

function isObject(input) {
  return (
    input !== null
    && typeof input === 'object'
    && !Array.isArray(input)
  );
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
  arraysToObject,
  compareObjects,
  findFlattenedDiff,
  flattenData,
  isPrimitive,
  isObject,
  objectFrom
};
