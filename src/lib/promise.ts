export const isPromise = <T>(input: T | Promise<T>): input is Promise<T> =>
  /* eslint-disable-next-line eqeqeq */
  Promise.resolve(input) == input;
export const promiseGuard = <T>(promise: T | Promise<T>): Promise<T | null> => {
  if (!isPromise(promise)) {
    return Promise.resolve(null);
  }

  try {
    return promise
      .then((value) => (value === undefined ? null : value))
      .catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
};
