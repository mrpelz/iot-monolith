import { BooleanState } from '../state/index.js';
import { ReadOnlyObservable } from '../observable/index.js';

export type PropertyKey = string | symbol;
export type PropertyValue = string | number | undefined;

enum ItemType {
  CONTENT,
  NODE,
  PROPERTY,
}

type ContentCallback = (node: Node) => void;

type ItemContent = [ItemType.CONTENT, ContentCallback];
type ItemNode = [ItemType.NODE, Node];
type ItemProperty = [ItemType.PROPERTY, PropertyKey, PropertyValue];

type Item = ItemNode | ItemProperty;
type ItemOrContent = ItemContent | Item;

enum MatchStrategy {
  ALL,
  NONE,
  SOME,
}

type MatchCb<R> = (matchStrategy: MatchStrategy, items: Item[]) => R;

type MatchesMember<R> = (...items: Item[]) => R;
type Matches<R> = MatchesMember<R> & {
  all: MatchesMember<R>;
  none: MatchesMember<R>;
  some: MatchesMember<R>;
};

type MatchNodesMemberSingle = Matches<Node | null>;
type MatchNodesMemberAll = Matches<Set<Node>>;
type MatchNodes = {
  allNodes: MatchNodesMemberAll;
  firstNode: MatchNodesMemberSingle;
  lastNode: MatchNodesMemberSingle;
};

type TagNames =
  | 'root'
  | 'section'
  | 'home'
  | 'building'
  | 'floor'
  | 'room'
  | 'item';

type CommonProps =
  | Record<string, string | true>
  | {
      children?: unknown;
    };

type FCProps = CommonProps & {
  children?: never;
};

type FunctionComponent = (props: FCProps) => Node;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type Element = Node;
    type IntrinsicElements = Record<TagNames, CommonProps>;
  }
}

const isFunctionComponent = (
  input: TagNames | FunctionComponent
): input is FunctionComponent => input instanceof Function;

const tagNameSymbol = Symbol('property key given for JSX-tagNames');

const isItem = (input: unknown): input is Item => {
  if (!Array.isArray(input)) return false;
  const [type] = input;

  if (type === ItemType.NODE) return true;
  if (type === ItemType.PROPERTY) return true;

  return false;
};

const isItemOrContent = (input: unknown): input is ItemOrContent => {
  if (!Array.isArray(input)) return false;
  const [type] = input;

  if (type === ItemType.CONTENT) return true;
  if (type === ItemType.NODE) return true;
  if (type === ItemType.PROPERTY) return true;

  return false;
};

const mkContent = (contentCallback: ContentCallback): ItemContent => [
  ItemType.CONTENT,
  contentCallback,
];

const isContent = (input: ItemOrContent): input is ItemContent => {
  const [type] = input;
  return type === ItemType.CONTENT;
};

const mkNode = (node: Node): ItemNode => [ItemType.NODE, node];

const isNode = (input: Item): input is ItemNode => {
  const [type] = input;
  return type === ItemType.NODE;
};

const mkProperty = (key: PropertyKey, value?: string): ItemProperty => [
  ItemType.PROPERTY,
  key,
  value || undefined,
];

const mkTagName = (value: TagNames): ItemProperty => [
  ItemType.PROPERTY,
  tagNameSymbol,
  value,
];

const isProperty = (input: Item): input is ItemProperty => {
  const [type] = input;
  return type === ItemType.PROPERTY;
};

export class Node {
  private static _matchNodes(nodes: Node[]): MatchNodes {
    return {
      allNodes: Node._matches<Set<Node>>(
        (...args) => new Set(nodes.filter((node) => node._matchItems(...args)))
      ),
      firstNode: Node._matches<Node | null>(
        (...args) => nodes.find((node) => node._matchItems(...args)) || null
      ),
      lastNode: Node._matches<Node | null>(
        (...args) =>
          nodes.reverse().find((node) => node._matchItems(...args)) || null
      ),
    };
  }

  private static _matches<R>(matchCb: MatchCb<R>) {
    const matches: Matches<R> = (...items) => matchCb(MatchStrategy.ALL, items);

    matches.all = (...items) => matchCb(MatchStrategy.ALL, items);
    matches.none = (...items) => matchCb(MatchStrategy.NONE, items);
    matches.some = (...items) => matchCb(MatchStrategy.SOME, items);

    return matches;
  }

  private readonly _children = new Set<Node>();
  private readonly _matchObservers = new Set<() => void>();
  private _parent: Node | null = null;
  private readonly _properies = new Map<PropertyKey, PropertyValue>();

  matchObserve: Matches<ReadOnlyObservable<boolean>>;
  matches: Matches<boolean>;

  constructor(...items: ItemOrContent[]) {
    this.matches = Node._matches((...args) => this._matchItems(...args));
    this.matchObserve = Node._matches((...args) =>
      this._matchItemsObserve(...args)
    );

    for (const item of items) {
      this.add(item);
    }
  }

  private _matchItemsObserve(
    matchStrategy: MatchStrategy = MatchStrategy.ALL,
    items: Item[]
  ): ReadOnlyObservable<boolean> {
    const match = () => this._matchItems(matchStrategy, items);
    const observer = new BooleanState(match());

    this._matchObservers.add(() => {
      observer.value = match();
    });

    return new ReadOnlyObservable(observer);
  }

  private _matches(item: Item): boolean {
    if (isNode(item)) {
      const [_, node] = item;

      return this._children.has(node);
    }

    if (isProperty(item)) {
      const [_, key, value] = item;

      const keyMatch = this._properies.has(key);
      const hasValue = value !== null;

      if (!hasValue) {
        return keyMatch;
      }

      if (keyMatch && hasValue) {
        return this._properies.get(key) === value;
      }

      return false;
    }

    return false;
  }

  private _setParent(parentNode: Node | null): void {
    this._parent = parentNode;
  }

  get children(): Set<Node> {
    return new Set(this._children);
  }

  get matchChildren(): MatchNodes {
    return Node._matchNodes(this.deepChildren());
  }

  get matchParents(): MatchNodes {
    return Node._matchNodes(this.deepParents());
  }

  get parent(): Node | null {
    return this._parent;
  }

  get properties(): Map<PropertyKey, PropertyValue> {
    return new Map(this._properies);
  }

  _matchItems(
    matchStrategy: MatchStrategy = MatchStrategy.ALL,
    items: Item[]
  ): boolean {
    const result = new Set<boolean>();

    for (const item of items) {
      result.add(this._matches(item));
    }

    switch (matchStrategy) {
      case MatchStrategy.ALL:
        return result.has(true) && !result.has(false);
      case MatchStrategy.NONE:
        return result.has(false) && !result.has(true);
      case MatchStrategy.SOME:
        return result.has(true);
      default:
        return false;
    }
  }

  add(item: ItemOrContent): void {
    if (!isItem(item)) {
      if (isContent(item)) {
        const [_, contentCallback] = item;

        contentCallback(this);
      }

      return;
    }

    if (isNode(item)) {
      const [_, node] = item;

      node._setParent(this);
      this._children.add(node);

      return;
    }

    if (isProperty(item)) {
      const [_, key, value] = item;

      this._properies.set(key, value);
    }

    for (const fn of this._matchObservers) {
      fn();
    }
  }

  chainOfParentsUntilMatch(item: Item): Node[] {
    return this.deepParents(undefined, (node: Node) => node.matches(item));
  }

  deepChildren(depth = Infinity): Node[] {
    const collection = new Set<Node>();

    const gatherChildren = (node: Node, compoundDepth: number) => {
      collection.add(node);

      const subtractDepth = compoundDepth - 1;
      if (!subtractDepth) return;

      for (const child of node.children) {
        gatherChildren(child, subtractDepth);
      }
    };

    gatherChildren(this, depth);

    return Array.from(collection);
  }

  deepParents(depth = Infinity, until?: (node: Node) => boolean): Node[] {
    const collection = new Set<Node>();
    let conditionalMatch = false;

    const gatherParents = (node: Node, compoundDepth: number) => {
      if (until) conditionalMatch = until(node);

      collection.add(node);

      const subtractDepth = compoundDepth - 1;

      if (conditionalMatch || !node.parent || !subtractDepth) return;

      gatherParents(node.parent, subtractDepth);
    };

    gatherParents(this, depth);

    return Array.from(collection);
  }

  remove(item: Item): void {
    if (isNode(item)) {
      const [_, node] = item;

      node._setParent(null);
      this._children.delete(node);

      return;
    }

    if (isProperty(item)) {
      const [_, key] = item;

      this._properies.delete(key);
    }

    for (const fn of this._matchObservers) {
      fn();
    }
  }

  toJSON(): string {
    return `Node ${JSON.stringify(this.toObject(), null, 2)}`;
  }

  toObject(): unknown {
    return {
      children: [...this._children].map((child) => child.toObject()),
      matchObservers: this._matchObservers.size,
      parent: Boolean(this._parent),
      properties: Object.fromEntries(this._properies),
    };
  }
}

export function h(
  tag: TagNames | FunctionComponent,
  props: Record<string, string | true> | null,
  ...children: (ItemOrContent | Node | ContentCallback)[]
): Node {
  if (isFunctionComponent(tag)) {
    return tag(props || {});
  }

  const items: ItemOrContent[] = [];

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      items.push(mkProperty(key, value === true ? undefined : value));
    }
  }

  for (const child of children) {
    if (isItemOrContent(child)) {
      items.push(child);
      continue;
    }

    if (child instanceof Node) {
      items.push(mkNode(child));
    }
  }

  return new Node(mkProperty(tagNameSymbol, tag), ...items);
}

export { mkContent as cb };
export { mkProperty as prop };
export { mkTagName as tag };
