const { Server } = require('http');
const { URL } = require('url');
const EventEmitter = require('events');

const { rebind } = require('../utils/oop');
const { emptyBuffer } = require('../utils/data');
const { arraysToObject } = require('../utils/structures');
const { Logger } = require('../log');

const libName = 'http-server';

class HttpServer extends EventEmitter {
  static do404() {
    return {
      handler: Promise.reject(new Error('Not found.')),
      rejectCode: 404
    };
  }

  static dropOff(instance) {
    instance.route('/robots.txt', HttpServer.do404);
    instance.route('/favicon.ico', HttpServer.do404);
  }

  constructor(options = {}) {
    super();

    this._httpServer = {};

    const {
      host = '0.0.0.0',
      port = null,
      handler = null,
      headers = {}
    } = options;

    if (!host || !port) {
      throw new Error('insufficient options provided');
    }

    this._httpServer.options = {
      host,
      port,
      headers,
      routes: {}
    };

    this._httpServer.globalHandler = handler;

    rebind(this, '_handleRequest', '_onListening', '_onClose');

    this._httpServer.server = new Server();
    this._httpServer.server.on('request', this._handleRequest);
    this._httpServer.server.on('listening', this._onListening);
    this._httpServer.server.on('close', this._onClose);

    const log = new Logger();
    log.friendlyName(`HttpServer (${host}:${port})`);
    this._httpServer.log = log.withPrefix(libName);
  }

  _handleRequest(request, response) {
    if (request.method !== 'GET') {
      response.writeHead(405);
      response.end();
    }

    const {
      log,
      globalHandler,
      options: {
        host,
        port,
        headers: globalHeaders,
        routes
      }
    } = this._httpServer;

    const httpHost = request.headers.host;
    const baseUrl = httpHost || `${host}:${port}`;

    Object.assign(request, {
      url: new URL(request.url, `http://${baseUrl}/`)
    });

    Object.assign(request, {
      urlQuery: arraysToObject(
        [...request.url.searchParams.keys()],
        [...request.url.searchParams.values()]
      )
    });

    log.info({
      head: 'request received',
      attachment: [
        `URL: ${request.url.href}`,
        `RemoteAddress: ${request.connection.remoteAddress}`,
        `RemotePort: ${request.connection.remotePort}`
      ].join('\n')
    });

    rebind(response, 'write');

    let match = {};
    const routeHandler = routes[request.url.pathname];

    if (routeHandler) {
      const route = routeHandler(request, response);

      if (route.handler) {
        match = route;
      }
    } else if (globalHandler) {
      const global = globalHandler(request, response);

      if (global.handler) {
        match = global;
      }
    }

    const {
      handler = null,
      resolveCode = 200,
      rejectCode = 500,
      headers: localHeaders = {},
      openEnd = false
    } = match;

    const headers = Object.assign(
      {},
      globalHeaders,
      localHeaders
    );

    if (handler) {
      handler.then((body) => {
        response.writeHead(resolveCode, headers);
        response.write(body || emptyBuffer);
        if (!openEnd) {
          response.end();
        }
      }).catch((reason) => {
        response.writeHead(rejectCode, headers);
        response.end(`[${rejectCode}]\n${reason.message || ''}`);
      });
    } else {
      response.writeHead(500, headers);
      response.end();
    }
  }

  _onListening() {
    const { log } = this._httpServer;

    log.info({
      head: 'listening',
      value: true
    });

    this.emit('listening');
  }

  _onClose() {
    const { log } = this._httpServer;

    log.info({
      head: 'listening',
      value: false
    });

    this.emit('close');
  }

  route(route, options) {
    const { log, options: { routes } } = this._httpServer;

    if (!route || !options) {
      throw new Error('insufficient options for route provided');
    }

    log.info(`add route for "${route}"`);

    routes[route] = options;
  }

  listen() {
    const {
      log,
      options,
      server
    } = this._httpServer;

    log.info({
      head: 'set listen',
      value: true
    });

    server.listen(options);
  }

  close() {
    const { log, server } = this._httpServer;

    log.info({
      head: 'set listen',
      value: false
    });

    server.close();
  }
}

module.exports = {
  HttpServer
};
