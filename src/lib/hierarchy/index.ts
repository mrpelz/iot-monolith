/* eslint-disable @typescript-eslint/ban-types */
import { Constructor } from '../oop/index.js';

export type StringOrSymbol = string | symbol;

enum MatchStrategy {
  ALL,
  NONE,
  SOME,
}

type Child = Content | Property | Node;

type MatchCb<R> = (matchStrategy: MatchStrategy, children: Child[]) => R;

type MatchesMember<R> = (...children: Child[]) => R;
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

type Levels =
  | 'root'
  | 'section'
  | 'home'
  | 'building'
  | 'floor'
  | 'room'
  | 'place'
  | 'item';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type Element = Node;
    type IntrinsicElements = Record<Levels, Record<string, string | true>>;
  }
}

const tagName = Symbol('property key given for JSX-tagNames');

export class Content {
  content: unknown;

  constructor(content: unknown) {
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

export class TagName extends Property {
  constructor(value: Levels) {
    super(tagName, value);
  }
}

export class Node {
  private static _matchNodes(collection: Node[]): MatchNodes {
    return {
      allNodes: Node._matches<Set<Node>>(
        (matchStrategy, children) =>
          new Set(
            collection.filter((node) =>
              node._matchChildren(matchStrategy, children)
            )
          )
      ),
      firstNode: Node._matches<Node | null>(
        (matchStrategy, children) =>
          collection.find((node) =>
            node._matchChildren(matchStrategy, children)
          ) || null
      ),
      lastNode: Node._matches<Node | null>(
        (matchStrategy, children) =>
          collection
            .reverse()
            .find((node) => node._matchChildren(matchStrategy, children)) ||
          null
      ),
    };
  }

  private static _matches<R>(matchCb: MatchCb<R>) {
    const matches: Matches<R> = (...matchChildren) =>
      matchCb(MatchStrategy.ALL, matchChildren);

    matches.all = (...matchChildren) =>
      matchCb(MatchStrategy.ALL, matchChildren);
    matches.none = (...matchChildren) =>
      matchCb(MatchStrategy.NONE, matchChildren);
    matches.some = (...matchChildren) =>
      matchCb(MatchStrategy.SOME, matchChildren);

    return matches;
  }

  private _children = new Set<Child>();
  private _content: Content | null = null;

  matches: Matches<boolean>;
  parent: Node | null = null;

  constructor(...children: Child[]) {
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

  private _matches(child: Child): boolean {
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

  get content(): Content | null {
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
    children: Child[]
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

  add(child: Child): this {
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

export function h(
  tag: Levels,
  props: JSX.IntrinsicElements[Levels] | null,
  ...children: (Node | unknown)[]
): Node {
  return new Node(
    new Property(tagName, tag),
    ...(props
      ? Object.entries(props).map(
          ([key, value]) =>
            new Property(key, value === true ? undefined : value)
        )
      : []),
    ...children.map((child) => {
      return child instanceof Node ? child : new Content(child);
    })
  );
}
