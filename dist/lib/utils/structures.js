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
 * @param {string[]} keyArray
 * @param {T[]} valueArray
 * @returns {{ [key: string]: T }}
 */
export function arraysToObject(keyArray, valueArray) {
    if (!Array.isArray(keyArray) || !Array.isArray(valueArray)) {
        throw new Error('inputs are not arrays');
    }
    if (keyArray.length !== valueArray.length) {
        throw new Error('array lengths do not match');
    }
    /**
     * @type {{ [key: string]: T }}
     */
    const result = {};
    keyArray.forEach((key, index) => {
        result[key] = valueArray[index];
    });
    return result;
}
/**
 * @template T
 * @param {T[]} input
 * @param {T[]} result
 * @returns {T[]}
 */
export function flattenArrays(input, result = []) {
    for (let i = 0; i < input.length; i += 1) {
        const value = input[i];
        if (Array.isArray(value)) {
            flattenArrays(value, result);
        }
        else {
            result.push(value);
        }
    }
    return result;
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
    return (input !== null
        && typeof input === 'object'
        && !Array.isArray(input));
}
/**
 * @template T
 * @param {T | any} object
 * @param  {...string} keys
 * @returns {Partial<T>}
 */
export function includeKeys(object, ...keys) {
    if (!isObject(object))
        throw new Error('input is not an object');
    const result = {};
    keys.forEach((key) => {
        const { [key]: value } = object;
        if (value === undefined)
            return;
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
    if (!isObject(object))
        throw new Error('input is not an object');
    const result = {};
    Object.keys(object).forEach((key) => {
        if (keys.includes(key))
            return;
        const { [key]: value } = object;
        if (value === undefined)
            return;
        result[key] = value;
    });
    return result;
}
//# sourceMappingURL=structures.js.map