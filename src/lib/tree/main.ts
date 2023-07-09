import {
  DeepClassStructureViaChildField,
  EmptyObject,
  ObjectValues,
  objectKeys,
  objectValues,
} from '../oop.js';

export enum Level {
  NONE,
  SYSTEM,
  HOME,
  BUILDING,
  FLOOR,
  ROOM,
  AREA,
  DEVICE,
  PROPERTY,
  ELEMENT,
}

export enum ValueType {
  NULL,
  BOOLEAN,
  NUMBER,
  STRING,
  RAW,
}

export type TValueType = {
  [ValueType.BOOLEAN]: boolean;
  [ValueType.NULL]: null;
  [ValueType.NUMBER]: number;
  [ValueType.RAW]: unknown;
  [ValueType.STRING]: string;
};

const $ = Symbol('element');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TElementAbstract = { [$]: null; props: any };

export type TElementProps<T extends TElementAbstract> = T['props'];
export type TElementPropValues<T extends TElementAbstract> = ObjectValues<
  TElementProps<T>
>;

export type TElementChildren<T extends TElementAbstract> = Element<
  TElementProps<Extract<TElementPropValues<T>, TElementAbstract>>
>;

export type TElementChildrenDeep<T extends TElementAbstract> = Element<
  TElementProps<DeepClassStructureViaChildField<T, TElementAbstract, 'props'>>
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TElementCallback = (element: Element<any>) => void;

export type TElementClass = typeof Element;
export type TElement = InstanceType<TElementClass>;

export class Element<T extends EmptyObject> {
  readonly [$] = null;

  constructor(public readonly props: T) {
    Object.freeze(props);
  }

  get children(): TElementChildren<this>[] {
    return objectValues(this.props).filter(
      (prop) => (prop as unknown) instanceof Element
    );
  }

  match<M extends EmptyObject>(match: M): this is this & Element<M> {
    for (const key of objectKeys(match)) {
      const a = this.props[key as keyof T] as unknown;
      const b = match[key];

      if (a === b) continue;

      return false;
    }

    return true;
  }

  matchChildren<M extends EmptyObject>(
    match: M
  ): Element<Extract<TElementProps<TElementChildren<this>>, M>>[] {
    return Array.from(
      new Set(this.children.filter((child) => child.match(match)))
    );
  }

  matchChildrenDeep<M extends EmptyObject>(
    match: M
  ): Element<Extract<T | TElementProps<TElementChildrenDeep<this>>, M>>[] {
    const selfMatch = this.match(match) ? [this] : [];
    const directMatch = this.matchChildren(match);
    const deepMatch = this.children.flatMap((child) =>
      child.matchChildrenDeep(match)
    );

    return Array.from(new Set([selfMatch, directMatch, deepMatch].flat(1)));
  }
}
