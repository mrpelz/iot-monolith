const { HttpServer } = require('../http/server');
const { rebind, resolveAlways } = require('../utils/oop');
const { every, RecurringMoment } = require('../utils/time');
const { parseString } = require('../utils/string');
const { Logger } = require('../log');

const libName = 'web-api';

class WebApi {
  constructor(options = {}) {
    const {
      host = undefined,
      port = null,
      hmiServer = null,
      scheduler = null,
      update = null
    } = options;

    if (!port || !hmiServer || !scheduler || !update) {
      throw new Error('insufficient options provided');
    }

    this._webApi = {
      isActive: false,
      clients: {}
    };

    rebind(this, '_handleIngest', '_handleStream', '_handleList', '_handleSet');

    this._setUpHttpServer(host, port);
    this._setUpHmiService(hmiServer, scheduler, update);

    const log = new Logger();
    log.friendlyName(`WebApi (${host}:${port})`);
    this._webApi.log = log.withPrefix(libName);
  }

  _setUpHttpServer(host, port) {
    const httpServer = new HttpServer({
      host,
      port,
      handler: HttpServer.do404,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    httpServer.route('/stream', this._handleStream);
    httpServer.route('/list', this._handleList);
    httpServer.route('/set', this._handleSet);
    this._webApi.httpServer = httpServer;
  }

  _setUpHmiService(hmiServer, scheduler, update) {
    const hmiService = hmiServer.addService(this._handleIngest);
    new RecurringMoment(
      scheduler,
      every.second(update)
    ).on('hit', () => {
      if (this._webApi.isActive) {
        hmiService.getAll();
      }
    });
    this._webApi.hmiService = hmiService;
  }

  _sendToStream(input) {
    const {
      clients
    } = this._webApi;

    Object.values(clients).forEach((write) => {
      write(input);
    });
  }

  _publishMessage(input) {
    const data = JSON.stringify(input, null, null);
    const payload = `data: ${data}\n\n`;

    this._sendToStream(payload);
  }

  _handleIngest(options) {
    const {
      name,
      attributes,
      value
    } = options;

    this._publishMessage({
      name,
      attributes,
      value
    });
  }

  _handleStream(request, response) {
    const { log, clients } = this._webApi;
    const { connection: { remoteAddress, remotePort } } = request;
    const { write } = response;

    log.info(`add stream from client "${remoteAddress}:${remotePort}"`);

    const name = `webApi/${remoteAddress}:${remotePort}`;

    this._publishMessage({
      isSystem: true,
      event: 'newClient',
      id: name
    });

    clients[name] = write;
    request.on('close', () => {
      log.info(`delete stream from client "${remoteAddress}:${remotePort}"`);
      delete clients[name];

      this._publishMessage({
        isSystem: true,
        event: 'delClient',
        id: name
      });
    });

    return {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8'
      },
      openEnd: true,
      handler: Promise.resolve(
        `: welcome to the event stream\n: client "${name}"\n\n`
      )
    };
  }

  _handleList() {
    const { hmiService } = this._webApi;

    return {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      handler: hmiService.list().then((values) => {
        return JSON.stringify(values, null, null);
      })
    };
  }

  _handleSet(request) {
    const { log, hmiService } = this._webApi;
    const {
      connection: {
        remoteAddress,
        remotePort
      },
      urlQuery
    } = request;

    log.info(`setting from client "${remoteAddress}:${remotePort}"`);

    const setters = Object.keys(urlQuery).map((key) => {
      const { [key]: input } = urlQuery;
      const value = parseString(input);

      return resolveAlways(hmiService.set(key, value));
    });

    return {
      handler: Promise.all(setters),
      resolveCode: 204
    };
  }

  start() {
    if (!this._webApi.isActive) {
      this._webApi.isActive = true;
      this._webApi.httpServer.listen();
    }
  }

  stop() {
    if (this._webApi.isActive) {
      this._webApi.isActive = false;
      this._webApi.httpServer.close();
    }
  }
}

module.exports = {
  WebApi
};
