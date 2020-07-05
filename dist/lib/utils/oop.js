/**
 * @param {Object} Class
 * @returns {string[]}
 */
export function classMethods(Class) {
    return Object.keys(Object.getOwnPropertyDescriptors(Class.prototype))
        .filter((name) => {
        return name !== 'constructor' && name[0] !== '_';
    });
}
/**
 * @param {Object} instance
 * @returns {string[]}
 */
export function instanceMethods(instance) {
    return Object.getOwnPropertyNames(Object.getPrototypeOf(instance))
        .filter((name) => {
        return name !== 'constructor' && name[0] !== '_';
    });
}
/**
 * @param {Promise} input
 * @returns {boolean}
 */
export function isPromise(input) {
    /* eslint-disable-next-line eqeqeq */
    return Promise.resolve(input) == input;
}
/**
 * rebind class methods
 * @param {Object} context class context (this)
 * @param  {...string} names method names
 */
export function rebind(context, ...names) {
    names.forEach((name) => {
        context[name] = context[name].bind(context);
    });
}
/**
 * @param {any} promise
 * @returns {Promise}
 */
export function resolveAlways(promise) {
    if (!isPromise(/** @type {Promise} */ (promise))) {
        return Promise.resolve(null);
    }
    return promise.then((value) => {
        return value === undefined ? null : value;
    }).catch(() => {
        return null;
    });
}
//# sourceMappingURL=oop.js.map