import { Base, Children } from '../jsx.js';
import { Levels, MetaSystem } from '../main.js';

export class Root extends Base {
  constructor({
    children,
    id,
  }: Omit<MetaSystem, 'level'> & { children?: Children }) {
    super({
      children,
      init: () => undefined,
      meta: { id, level: Levels.SYSTEM },
    });
  }
}
