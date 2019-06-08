/* eslint-disable no-console */
const { HttpServer } = require('../server');

function globalHandler(request) {
  return {
    handler: Promise.resolve([
      '[Mirroring the URL]',
      request.url.pathname
    ].join('\n'))
  };
}

const server = new HttpServer({
  port: 8080,
  headers: {
    Server: 'node shit'
  },
  handler: globalHandler
});

server.route('/', () => {
  return {
    handler: Promise.resolve('Yay, you\'ve reached the "/"-page')
  };
});

server.route('/redirect', () => {
  return {
    handler: Promise.resolve('redirecting you'),
    resolveCode: 302,
    headers: {
      Location: 'http://google.com'
    }
  };
});

server.route('/no', () => {
  return {
    handler: Promise.reject(new Error('No!'))
  };
});

server.route('/postTest', (request) => {
  return {
    handler: (request.postPayload || Promise.reject(new Error('not a POST!'))).then((value) => {
      return `Received POST: ${value}`;
    })
  };
});

server.route('/404', () => {
  return {
    handler: Promise.reject(new Error('This is 404-land')),
    rejectCode: 404
  };
});

server.listen();
