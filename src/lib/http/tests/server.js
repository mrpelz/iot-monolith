/* eslint-disable no-console */
import { HttpServer } from '../server.js';

function globalHandler(request) {
  return {
    handler: Promise.resolve(
      ['[Mirroring the URL]', request.url.pathname].join('\n')
    ),
  };
}

const server = new HttpServer({
  handler: globalHandler,
  headers: {
    Server: 'node shit',
  },
  port: 8080,
});

server.route('/', () => {
  return {
    handler: Promise.resolve('Yay, you\'ve reached the "/"-page'),
  };
});

server.route('/redirect', () => {
  return {
    handler: Promise.resolve('redirecting you'),
    headers: {
      Location: 'http://google.com',
    },
    resolveCode: 302,
  };
});

server.route('/no', () => {
  return {
    handler: Promise.reject(new Error('No!')),
  };
});

server.route('/postTest', (request) => {
  return {
    handler: (
      request.postPayload || Promise.reject(new Error('not a POST!'))
    ).then((value) => {
      return `Received POST: ${value}`;
    }),
  };
});

server.route('/404', () => {
  return {
    handler: Promise.reject(new Error('This is 404-land')),
    rejectCode: 404,
  };
});

server.listen();
