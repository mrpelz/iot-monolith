/* eslint-disable max-depth */
/* eslint-disable complexity */

import { Tree, isValidValue } from '../lib/tree/main.js';
import { HttpServer } from '../lib/http-server.js';

const PATH_HOOKS = '/hooks' as const;
const PATH_DELIMITER = '.' as const;

export function hooks(httpServer: HttpServer, tree: Tree): void {
  httpServer.route(PATH_HOOKS, ({ request, response, url, utils }) => {
    const { method } = request;
    const { searchParams } = url;

    const path = searchParams.get('path')?.split(PATH_DELIMITER);
    if (!path) {
      utils.badRequest();

      return;
    }

    if (
      path.findIndex((pathPart) => ['get', 'set'].includes(pathPart)) !== -1
    ) {
      utils.badRequest();

      return;
    }

    const state = path.reduce(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      (parent, pathPart) => parent?.children?.[pathPart],
      tree.structure
    );

    if (typeof state !== 'object' || typeof state.meta !== 'object') {
      utils.notFound();

      return;
    }

    if (method === 'POST' && 'set' in state && searchParams.has('value')) {
      const value = (() => {
        const _value = searchParams.get('value');

        if (!_value) return null;

        try {
          return JSON.parse(_value);
        } catch {
          return null;
        }
      })();

      if (isValidValue(value, state.meta.valueType)) {
        tree.set(state.set, value);

        response.writeHead(201, 'No content');
        response.end();

        return;
      }

      utils.badRequest();

      return;
    }

    if ('get' in state) {
      response.end(`${JSON.stringify(tree.value(state.get))}\n`);

      return;
    }

    utils.notFound();
  });
}
