import { BooleanState } from '../state/index.js';
import { ReadOnlyObservable } from '../observable/index.js';

export type StringOrSymbol = string | symbol;

enum ItemType {
  CONTENT_CALLBACK,
  CONTENT,
  NODE,
  PROPERTY,
}

type ContentCallback = (node: Node) => unknown;

type ItemContent = [ItemType.CONTENT, unknown];
type ItemContentCallback = [ItemType.CONTENT_CALLBACK, ContentCallback];
type ItemNode = [ItemType.NODE, Node];
type ItemProperty = [ItemType.PROPERTY, StringOrSymbol, string | undefined];

type Item = ItemContent | ItemNode | ItemProperty;
type ItemOrCallback =
  | ItemContent
  | ItemContentCallback
  | ItemNode
  | ItemProperty;

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

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type Element = Node;
    type ElementChildrenAttribute = {
      children: unknown;
    };
    type IntrinsicElements = Record<
      TagNames,
      | Record<string, string | true>
      | {
          children?: unknown;
        }
    >;
  }
}

const tagNameSymbol = Symbol('property key given for JSX-tagNames');

const isItem = (input: unknown): input is Item => {
  if (!Array.isArray(input)) return false;
  const [type] = input;

  if (type === ItemType.CONTENT) return true;
  if (type === ItemType.NODE) return true;
  if (type === ItemType.PROPERTY) return true;

  return false;
};

const isItemOrCallback = (input: unknown): input is ItemOrCallback => {
  if (!Array.isArray(input)) return false;
  const [type] = input;

  if (type === ItemType.CONTENT_CALLBACK) return true;
  if (type === ItemType.CONTENT) return true;
  if (type === ItemType.NODE) return true;
  if (type === ItemType.PROPERTY) return true;

  return false;
};

const mkContent = (content: unknown): ItemContent => [
  ItemType.CONTENT,
  content,
];

const isContent = (input: Item): input is ItemContent => {
  const [type] = input;
  return type === ItemType.CONTENT;
};

const mkContentCallback = (
  contentCallback: ContentCallback
): ItemContentCallback => [ItemType.CONTENT_CALLBACK, contentCallback];

const isContentCallback = (
  input: ItemOrCallback
): input is ItemContentCallback => {
  const [type] = input;
  return type === ItemType.CONTENT_CALLBACK;
};

const mkNode = (node: Node): ItemNode => [ItemType.NODE, node];

const isNode = (input: Item): input is ItemNode => {
  const [type] = input;
  return type === ItemType.NODE;
};

const mkProperty = (key: StringOrSymbol, value?: string): ItemProperty => [
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

class Node {
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
  private readonly _content = new Set<unknown>();
  private readonly _matchObservers = new Set<() => void>();
  private _parent: Node | null = null;
  private readonly _properies = new Map<StringOrSymbol, string | undefined>();

  matchObserve: Matches<ReadOnlyObservable<boolean>>;
  matches: Matches<boolean>;

  constructor(...items: ItemOrCallback[]) {
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
    if (isContent(item)) {
      const [_, content] = item;

      return this._content.has(content);
    }

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

  get content(): Set<unknown> {
    return new Set(this._content);
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

  get properties(): Map<StringOrSymbol, string | undefined> {
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

  add(item: ItemOrCallback): void {
    if (!isItem(item)) {
      if (isContentCallback(item)) {
        const [_, contentCallback] = item;

        this._content.add(contentCallback(this));
      }

      return;
    }

    if (isContent(item)) {
      const [_, content] = item;

      this._content.add(content);

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
    if (isContent(item)) {
      const [_, content] = item;

      this._content.delete(content);

      return;
    }

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
      content: [...this._content],
      matchObservers: this._matchObservers.size,
      parent: Boolean(this._parent),
      properties: Object.fromEntries(this._properies),
    };
  }
}

export function h(
  tag: TagNames,
  props: Record<string, string | true> | null,
  ...children: unknown[]
): Node {
  return new Node(
    mkProperty(tagNameSymbol, tag),
    ...(props
      ? Object.entries(props).map(([key, value]) =>
          mkProperty(key, value === true ? undefined : value)
        )
      : []),
    ...children.map((child) => {
      if (isItemOrCallback(child)) {
        return child;
      }

      return child instanceof Node ? mkNode(child) : mkContent(child);
    })
  );
}

export { mkContentCallback as cb };
export { mkProperty as prop };
export { mkTagName as tag };
