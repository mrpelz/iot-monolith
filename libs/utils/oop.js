function classMethods(Class) {
  return Object.keys(Object.getOwnPropertyDescriptors(Class.prototype))
    .filter((name) => {
      return name !== 'constructor' && name[0] !== '_';
    });
}

function instanceMethods(instance) {
  return Object.getOwnPropertyNames(Object.getPrototypeOf(instance))
    .filter((name) => {
      return name !== 'constructor' && name[0] !== '_';
    });
}

function isPromise(input) {
  /* eslint-disable-next-line eqeqeq */
  return Promise.resolve(input) == input;
}

function rebind(context, ...names) {
  names.forEach((name) => {
    context[name] = context[name].bind(context);
  });
}

function resolveAlways(promise) {
  if (!isPromise(promise)) {
    return Promise.resolve(null);
  }

  return promise.then((value) => {
    return value === undefined ? null : value;
  }).catch(() => {
    return null;
  });
}

module.exports = {
  classMethods,
  instanceMethods,
  isPromise,
  rebind,
  resolveAlways
};
