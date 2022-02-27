// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T> = { new (...args: any[]): T };

export const classMethods = (
  classDefinition: Constructor<Record<string, unknown>>
): string[] => {
  return Object.keys(
    Object.getOwnPropertyDescriptors(classDefinition.prototype)
  ).filter((name) => {
    return name !== 'constructor' && name[0] !== '_';
  });
};

export const instanceMethods = (
  instance: Record<string, unknown>
): string[] => {
  return Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).filter(
    (name) => {
      return name !== 'constructor' && name[0] !== '_';
    }
  );
};

export const isPromise = <T>(input: T | Promise<T>): input is Promise<T> => {
  /* eslint-disable-next-line eqeqeq */
  return Promise.resolve(input) == input;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const rebind = (context: any, ...names: string[]): void => {
  for (const name of names) {
    const fn = context[name];
    if (typeof fn !== 'function') return;

    context[name] = fn.bind(context);
  }
};

export const promiseGuard = <T>(promise: T | Promise<T>): Promise<T | null> => {
  if (!isPromise(promise)) {
    return Promise.resolve(null);
  }

  return promise
    .then((value) => {
      return value === undefined ? null : value;
    })
    .catch(() => {
      return null;
    });
};
