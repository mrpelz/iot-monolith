import { jsonParseGuarded } from '@mrpelz/misc-utils/data';
import { AnyWritableObservable } from '@mrpelz/observable';
import { NullState } from '@mrpelz/observable/state';
import { stripIndent } from 'proper-tags';

import { HttpServer } from './http-server.js';
import { callstack, Logger } from './log.js';
import { isValueType } from './tree/main.js';
import {
  InteractionType,
  Serialization,
  valueTypeDescription,
} from './tree/operations/serialization.js';

const PATH_HOOKS = '/hooks' as const;

export const httpHooks = (
  logger: Logger,
  httpServer: HttpServer,
  serialization: Serialization<object>,
): void => {
  const log = logger.getInput({ head: 'httpHooks' });

  httpServer.route(PATH_HOOKS, async ({ request, response, url, utils }) => {
    response.setHeader('content-type', 'text/plain;charset=utf-8');

    if (utils.constrainMethod(['GET', 'POST'])) return;

    const id = url.searchParams.get('id');
    if (!id) {
      log.info(() => 'no id provided');

      utils.badRequest(
        stripIndent`
          no "id" query parameter provided

          # How to Use
          * GET request, if no value is to be written
          * supply an interaction’s UUID via the "id" query parameter
          * value is retuned as a single-value JSON-string
          * optionally, set the query parameter "follow=1"
              to keep the response open and feed value updates by line

          ## writing a value
          * POST request
          * add a single-value JSON-string to the request body
        `,
      );

      return;
    }

    const interaction = serialization.interaction(id);
    if (!interaction) {
      log.info(() => `interaction "${id}" not found`);

      utils.notFound(
        stripIndent`
          no interaction with UUID "${id}" has been found
        `,
      );

      return;
    }

    const { state, type, valueType } = interaction;

    if (
      type !== InteractionType.COLLECT &&
      utils.constrainMethod(
        'GET',
        stripIndent`
          interaction with UUID "${id}" cannot be written
        `,
      )
    ) {
      log.info(
        () => `write to interaction "${id}": interaction is non-writable`,
      );

      return;
    }

    if (request.method === 'POST') {
      const requestBody = await utils.requestBody();

      if (!requestBody?.length) {
        log.info(() => `write to interaction "${id}": no value provided`);

        utils.badRequest(
          stripIndent`
            no value provided in request body
          `,
        );

        return;
      }

      const result = jsonParseGuarded(requestBody.toString());

      if (result instanceof Error) {
        log.error(
          () => `write to interaction "${id}": provided value non-parsable`,
          callstack(result),
        );

        utils.badRequest(
          stripIndent`
            error parsing given request body:

            ${result.message}
          `,
        );

        return;
      }

      if (!isValueType(result, valueType)) {
        log.info(() => `write to interaction "${id}": wrong value type`);

        utils.badRequest(
          stripIndent`
            value provided in request body has wrong type

            provided value is of type "${typeof result}"
            required type for interaction is ${valueTypeDescription[valueType]}
          `,
        );

        return;
      }

      (state as AnyWritableObservable<unknown> | NullState<unknown>).value =
        result;
    }

    response.write(`${JSON.stringify(state.value)}\n`);

    const isFollow = url.searchParams.get('follow') === '1';
    if (!isFollow) {
      response.end();

      return;
    }

    const observer = state.observe((value) => {
      if (!response.writable) return;

      response.write(`${JSON.stringify(value)}\n`);
    });

    request.on('close', () => {
      observer.remove();
      response.end();
    });
  });
};
