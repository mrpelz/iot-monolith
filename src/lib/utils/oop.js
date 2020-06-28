export function classMethods(Class) {
  return Object.keys(Object.getOwnPropertyDescriptors(Class.prototype))
    .filter((name) => {
      return name !== 'constructor' && name[0] !== '_';
    });
}

export function instanceMethods(instance) {
  return Object.getOwnPropertyNames(Object.getPrototypeOf(instance))
    .filter((name) => {
      return name !== 'constructor' && name[0] !== '_';
    });
}

export function isPromise(input) {
  /* eslint-disable-next-line eqeqeq */
  return Promise.resolve(input) == input;
}

/**
 * rebind class methods
 * @param {any} context class context (this)
 * @param  {...string} names method names
 */
export function rebind(context, ...names) {
  names.forEach((name) => {
    context[name] = context[name].bind(context);
  });
}

export function resolveAlways(promise) {
  if (!isPromise(promise)) {
    return Promise.resolve(null);
  }

  return promise.then((value) => {
    return value === undefined ? null : value;
  }).catch(() => {
    return null;
  });
}
