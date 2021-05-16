import { Constructor } from '../oop/index.js';

export type StringOrSymbol = string | symbol;

export class Content<T> {
  content: T;

  constructor(content: T) {
    this.content = content;
  }
}

export class Property {
  key: StringOrSymbol;
  value?: string;

  constructor(key: StringOrSymbol, value?: string) {
    this.key = key;
    this.value = value;
  }
}

enum MatchStrategy {
  ALL,
  NONE,
  SOME,
}

type Child<T> = Content<T> | Property | Node<unknown>;

type MatchCb<R> = (
  matchStrategy: MatchStrategy,
  children: Child<unknown>[]
) => R;

type MatchesMember<T, R> = (...children: Child<T>[]) => R;
type Matches<T, R> = MatchesMember<T, R> & {
  all: MatchesMember<T, R>;
  none: MatchesMember<T, R>;
  some: MatchesMember<T, R>;
};

type MatchNodesMemberSingle = Matches<unknown, Node | null>;
type MatchNodesMemberAll = Matches<unknown, Set<Node>>;
type MatchNodes = {
  allNodes: MatchNodesMemberAll;
  firstNode: MatchNodesMemberSingle;
  lastNode: MatchNodesMemberSingle;
};

export class Node<T = unknown> {
  private static _matchNodes(collection: Node[]): MatchNodes {
    return {
      allNodes: Node._matches<unknown, Set<Node>>(
        (matchStrategy, children) =>
          new Set(
            collection.filter((node) =>
              node._matchChildren(matchStrategy, children)
            )
          )
      ),
      firstNode: Node._matches<unknown, Node | null>(
        (matchStrategy, children) =>
          collection.find((node) =>
            node._matchChildren(matchStrategy, children)
          ) || null
      ),
      lastNode: Node._matches<unknown, Node | null>(
        (matchStrategy, children) =>
          collection
            .reverse()
            .find((node) => node._matchChildren(matchStrategy, children)) ||
          null
      ),
    };
  }

  private static _matches<M, R>(matchCb: MatchCb<R>) {
    const matches: Matches<M, R> = (...matchChildren) =>
      matchCb(MatchStrategy.ALL, matchChildren);

    matches.all = (...matchChildren) =>
      matchCb(MatchStrategy.ALL, matchChildren);
    matches.none = (...matchChildren) =>
      matchCb(MatchStrategy.NONE, matchChildren);
    matches.some = (...matchChildren) =>
      matchCb(MatchStrategy.SOME, matchChildren);

    return matches;
  }

  private _children = new Set<Child<T>>();
  private _content: Content<T> | null = null;

  matches: Matches<T, boolean>;
  parent: Node | null = null;

  constructor(...children: Child<T>[]) {
    for (const child of children) {
      this.add(child);

      if (!(child instanceof Node)) continue;
      child._setParent(this);
    }

    this.matches = Node._matches((...args) => this._matchChildren(...args));
  }

  private _get<R>(constructor: Constructor<R>): Set<R> {
    const result = new Set<R>();

    for (const child of this._children) {
      if (child instanceof constructor) {
        result.add(child);
      }
    }

    return result;
  }

  private _matches(child: Child<unknown>): boolean {
    if (child instanceof Content) {
      return Boolean(this.content?.content === child.content);
    } else if (child instanceof Property) {
      return Boolean(
        Array.from(this.properties).find((matchChild) => {
          const keyMatches = matchChild.key === child.key;
          if (!child.value) return keyMatches;

          return keyMatches && matchChild.value === child.value;
        })
      );
    }

    return this._children.has(child);
  }

  private _setParent(parentNode: Node): this {
    this.parent = parentNode;
    return this;
  }

  get childNodes(): Set<Node> {
    return this._get<Node>(Node);
  }

  get content(): Content<T> | null {
    return this._content;
  }

  get matchChildren(): MatchNodes {
    return Node._matchNodes(this.deepChildNodes());
  }

  get matchParents(): MatchNodes {
    return Node._matchNodes(this.deepParentNodes());
  }

  get properties(): Set<Property> {
    return this._get<Property>(Property);
  }

  _matchChildren(
    matchStrategy: MatchStrategy = MatchStrategy.ALL,
    children: Child<unknown>[]
  ): boolean {
    const result = new Set<boolean>();

    for (const child of children) {
      result.add(this._matches(child));
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

  add(child: Child<T>): this {
    if (child instanceof Content) {
      if (this._content) {
        throw new Error('content already set');
      }

      this._content = child;
      return this;
    }

    if (child instanceof Node) {
      child._setParent(this);
    }

    this._children.add(child);
    return this;
  }

  deepChildNodes(): Node[] {
    const deepChildren = new Set<Node>();

    const gatherChildren = (node: Node, collection: Set<Node>) => {
      collection.add(node);

      for (const child of node.childNodes) {
        gatherChildren(child, collection);
      }
    };

    gatherChildren(this, deepChildren);

    return Array.from(deepChildren);
  }

  deepParentNodes(): Node[] {
    const deepParents = new Set<Node>();

    const gatherParents = (node: Node, collection: Set<Node>) => {
      collection.add(node);

      if (!node.parent) return;

      gatherParents(node.parent, collection);
    };

    gatherParents(this, deepParents);

    return Array.from(deepParents);
  }
}
