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

function findFlattenedDiff(a, b) {
  if (
    !a
    || typeof a !== 'object'
    || Array.isArray(a)
  ) {
    throw new Error('input "a" is not an object');
  }

  if (
    !b
    || typeof b !== 'object'
    || Array.isArray(b)
  ) {
    throw new Error('input "b" is not an object');
  }

  const keys = [
    ...new Set(
      [
        ...Object.keys(a),
        ...Object.keys(b)
      ]
    )
  ];

  const result = {};

  keys.filter((key) => {
    const { [key]: valueA } = a;
    const { [key]: valueB } = b;

    return valueA !== valueB;
  }).forEach((key) => {
    const { [key]: valueA } = a;
    const { [key]: valueB } = b;

    result[key] = {
      a: valueA,
      b: valueB
    };
  });

  return result;
}

module.exports = {
  arraysToObject,
  findFlattenedDiff,
  flattenData
};
