import { BooleanState } from '../state/index.js';

export type StringOrSymbol = string | symbol;

enum ItemType {
  CONTENT,
  NODE,
  PROPERTY,
}

type ItemContent = [ItemType.CONTENT, unknown];
type ItemNode = [ItemType.NODE, Node];
type ItemProperty = [ItemType.PROPERTY, StringOrSymbol, string | undefined];

type Item = ItemContent | ItemNode | ItemProperty;

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
    type IntrinsicElements = Record<TagNames, Record<string, string | true>>;
  }
}

const tagNameSymbol = Symbol('property key given for JSX-tagNames');

export const content = (_content: unknown): ItemContent => [
  ItemType.CONTENT,
  _content,
];

export const node = (_node: Node): ItemNode => [ItemType.NODE, _node];

export const property = (
  _key: StringOrSymbol,
  _value?: string
): ItemProperty => [ItemType.PROPERTY, _key, _value || undefined];

export const tagName = (_value: TagNames): ItemProperty => [
  ItemType.PROPERTY,
  tagNameSymbol,
  _value,
];

class Node {
  private static _matchNodes(nodes: Node[]): MatchNodes {
    return {
      allNodes: Node._matches<Set<Node>>(
        (...args) =>
          new Set(nodes.filter((_node) => _node._matchItems(...args)))
      ),
      firstNode: Node._matches<Node | null>(
        (...args) => nodes.find((_node) => _node._matchItems(...args)) || null
      ),
      lastNode: Node._matches<Node | null>(
        (...args) =>
          nodes.reverse().find((_node) => _node._matchItems(...args)) || null
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

  matchObserve: Matches<BooleanState>;
  matches: Matches<boolean>;

  constructor(...items: Item[]) {
    for (const item of items) {
      this.add(item);
    }

    this.matches = Node._matches((...args) => this._matchItems(...args));
    this.matchObserve = Node._matches((...args) =>
      this._matchItemsObserve(...args)
    );
  }

  private _matchItemsObserve(
    matchStrategy: MatchStrategy = MatchStrategy.ALL,
    items: Item[]
  ): BooleanState {
    const match = () => this._matchItems(matchStrategy, items);
    const observer = new BooleanState(match());

    this._matchObservers.add(() => {
      observer.value = match();
    });

    return observer;
  }

  private _matches(item: Item): boolean {
    const [type] = item;

    if (type === ItemType.CONTENT) {
      const [_, _content] = item as ItemContent;

      return this._content.has(_content);
    }

    if (type === ItemType.NODE) {
      const [_, _node] = item as ItemNode;

      return this._children.has(_node);
    }

    if (type === ItemType.PROPERTY) {
      const [_, _key, _value] = item as ItemProperty;

      const keyMatch = this._properies.has(_key);
      const hasValue = _value !== null;

      if (!hasValue) {
        return keyMatch;
      }

      if (keyMatch && hasValue) {
        return this._properies.get(_key) === _value;
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

  add(item: Item): void {
    const [type] = item;

    if (type === ItemType.CONTENT) {
      const [_, _content] = item as ItemContent;

      this._content.add(_content);

      return;
    }

    if (type === ItemType.NODE) {
      const [_, _node] = item as ItemNode;

      _node._setParent(this);
      this._children.add(_node);

      return;
    }

    if (type === ItemType.PROPERTY) {
      const [_, _key, _value] = item as ItemProperty;

      this._properies.set(_key, _value);
    }

    for (const fn of this._matchObservers) {
      fn();
    }
  }

  chainOfParentsUntilMatch(item: Item): Node[] {
    return this.deepParents(undefined, (_node: Node) => _node.matches(item));
  }

  deepChildren(depth = Infinity): Node[] {
    const collection = new Set<Node>();

    const gatherChildren = (_node: Node, _depth: number) => {
      collection.add(_node);

      const subtractDepth = _depth - 1;
      if (!subtractDepth) return;

      for (const child of _node.children) {
        gatherChildren(child, subtractDepth);
      }
    };

    gatherChildren(this, depth);

    return Array.from(collection);
  }

  deepParents(depth = Infinity, until?: (node: Node) => boolean): Node[] {
    const collection = new Set<Node>();
    let conditionalMatch = false;

    const gatherParents = (_node: Node, _depth: number) => {
      if (until) conditionalMatch = until(_node);

      collection.add(_node);

      const subtractDepth = _depth - 1;

      if (conditionalMatch || !_node.parent || !subtractDepth) return;

      gatherParents(_node.parent, subtractDepth);
    };

    gatherParents(this, depth);

    return Array.from(collection);
  }

  remove(item: Item): void {
    const [type] = item;

    if (type === ItemType.CONTENT) {
      const [_, _content] = item as ItemContent;

      this._content.delete(_content);

      return;
    }

    if (type === ItemType.NODE) {
      const [_, _node] = item as ItemNode;

      _node._setParent(null);
      this._children.delete(_node);

      return;
    }

    if (type === ItemType.PROPERTY) {
      const [_, _key] = item as ItemProperty;

      this._properies.delete(_key);
    }

    for (const fn of this._matchObservers) {
      fn();
    }
  }
}

export function h(
  tag: TagNames,
  props: Record<string, string | true> | null,
  ...children: (Node | unknown)[]
): Node {
  return new Node(
    property(tagNameSymbol, tag),
    ...(props
      ? Object.entries(props).map(([key, value]) =>
          property(key, value === true ? undefined : value)
        )
      : []),
    ...children.map((child) => {
      return child instanceof Node ? node(child) : content(child);
    })
  );
}
