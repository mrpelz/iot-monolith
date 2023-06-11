import { Tree, isValidValue } from './tree/util.js';
import { HttpServer } from './http-server.js';

const PATH_HOOKS = '/hooks' as const;
const PATH_DELIMITER = '.' as const;

export const hooks = (httpServer: HttpServer, tree: Tree): void => {
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

    const hasGetter = 'get' in state && state.get !== undefined;
    const hasSetter = 'set' in state && state.set !== undefined;

    if (method === 'POST' && hasSetter && searchParams.has('value')) {
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

    if (hasGetter) {
      response.write(`${JSON.stringify(tree.getter(state.get)?.value)}\n`);

      if (searchParams.get('follow') === '1') {
        const getter = tree.getter(state.get);
        if (!getter) {
          response.end();

          return;
        }

        request.socket.setNoDelay(true);

        const subscription = getter.observe((value) => {
          if (!response.writable) return;

          response.write(`${JSON.stringify(value)}\n`);
        });

        const handleClose = () => {
          subscription.remove();
          response.end();
        };

        request.on('close', handleClose);
        request.on('end', handleClose);
        request.on('error', () => handleClose);

        return;
      }

      response.end();

      return;
    }

    utils.notFound();
  });
};
