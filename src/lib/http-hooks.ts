import { Element, descriptionValueType, isValueType } from './tree/main.js';
import {
  InteractionType,
  Serialization,
} from './tree/operations/serialization.js';
import { AnyWritableObservable } from './observable.js';
import { HttpServer } from './http-server.js';
import { NullState } from './state.js';
import { multiline } from './string.js';

const PATH_HOOKS = '/hooks' as const;

export const httpHooks = (
  httpServer: HttpServer,
  serialization: Serialization<Element>
): void => {
  const { interactions } = serialization;

  httpServer.route(PATH_HOOKS, async ({ request, response, url, utils }) => {
    try {
      response.setHeader('content-type', 'text/plain;charset=utf-8');

      if (utils.constrainMethod(['GET', 'POST'])) return;

      const id = url.searchParams.get('id');
      if (!id) {
        utils.badRequest(
          multiline`
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
          `()
        );

        return;
      }

      const interaction = interactions.get(id);
      if (!interaction) {
        utils.notFound(
          multiline`
            no interaction with UUID "${id}" has been found
          `()
        );

        return;
      }

      const { state, type, valueType } = interaction;

      if (
        type !== InteractionType.COLLECT &&
        utils.constrainMethod(
          'GET',
          multiline`
            interaction with UUID "${id}" cannot be written
          `()
        )
      ) {
        return;
      }

      if (request.method === 'POST') {
        const requestBody = await utils.requestBody();

        if (!requestBody?.length) {
          utils.badRequest(
            multiline`
              no value provided in request body
            `()
          );
        }

        let value;

        try {
          value = JSON.parse(requestBody.toString());
        } catch (error) {
          utils.badRequest(
            multiline`
              error parsing given request body:

              ${error.message}
            `()
          );

          return;
        }

        if (!isValueType(value, valueType)) {
          utils.badRequest(
            multiline`
              value provided in request body has wrong type

              provided value is of type "${typeof value}"
              required type for interaction is ${
                descriptionValueType[valueType]
              }
            `()
          );

          return;
        }

        (state as AnyWritableObservable<unknown> | NullState<unknown>).value =
          value;
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
    } catch (error) {
      response.end();

      console.error(error);
    }
  });
};
