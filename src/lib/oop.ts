// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T> = { new (...args: any[]): T };

export const classMethods = (
  classDefinition: Constructor<Record<string, unknown>>
): string[] =>
  Object.keys(
    Object.getOwnPropertyDescriptors(classDefinition.prototype)
  ).filter((name) => name !== 'constructor' && name[0] !== '_');

export const instanceMethods = (instance: Record<string, unknown>): string[] =>
  Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).filter(
    (name) => name !== 'constructor' && name[0] !== '_'
  );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const rebind = (context: any, ...names: string[]): void => {
  for (const name of names) {
    const fn = context[name];
    if (typeof fn !== 'function') return;

    context[name] = fn.bind(context);
  }
};

export const objectProperties = <T extends Record<string | symbol, unknown>>(
  input: T
): (keyof T)[] => [
  ...Object.getOwnPropertySymbols(input),
  ...Object.getOwnPropertyNames(input),
];
