const { classMethods, instanceMethods, isPromise } = require('../utils/oop');
const { objectFrom } = require('../utils/structures');

function cache(instance, cacheTimes) {
  const methods = {};

  Object.keys(cacheTimes).forEach((methodName) => {
    if (!instance[methodName]) {
      throw new Error(`method "${methodName} does not exist on instance`);
    }

    const { [methodName]: cacheTime } = cacheTimes;
    let buffer = {};
    const deferred = [];

    const defer = () => {
      return new Promise((resolve, reject) => {
        deferred.push({
          resolve,
          reject
        });
      });
    };

    methods[methodName] = (...args) => {
      const now = Date.now();
      const {
        time = 0,
        value,
        promise,
        promiseReject
      } = buffer;

      if (deferred.length) {
        return defer();
      }

      if (now > (cacheTime + time)) {
        const result = instance[methodName](...args);

        if (isPromise(result)) {
          buffer.time = now;

          result.then((promiseResult) => {
            buffer = {
              time: now,
              value: promiseResult,
              promise: true,
              promiseReject: false
            };

            deferred.forEach((response) => {
              response.resolve(promiseResult);
            });

            deferred.length = 0;
          }).catch((reason) => {
            deferred.forEach((response) => {
              response.reject(reason);
            });

            buffer = {
              time: now,
              value: reason,
              promise: true,
              promiseReject: true
            };

            deferred.length = 0;
          });

          return defer();
        }

        buffer = {
          time: now,
          value: result,
          promise: false,
          promiseReject: false
        };
        return result;
      }

      if (promise) {
        if (promiseReject) {
          return Promise.reject(value);
        }

        return Promise.resolve(value);
      }

      return value;
    };
  });

  return new Proxy(methods, {
    get: (object, property) => {
      return property in object
        ? object[property]
        : instance[property];
    }
  });
}

function cacheAll(instance, time, RootClass = null) {
  return cache(
    instance,
    objectFrom(
      time,
      ...(
        RootClass
          ? classMethods(RootClass)
          : instanceMethods(instance)
      ).filter((name) => {
        return name !== 'access';
      })
    )
  );
}

module.exports = {
  cache,
  cacheAll
};
