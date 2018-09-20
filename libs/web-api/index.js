const { HttpServer } = require('../http/server');
const { rebind, resolveAlways } = require('../utils/oop');
const { every, RecurringMoment } = require('../utils/time');
const { parseString } = require('../utils/string');
const { Logger } = require('../log');

const libName = 'web-api';

const refreshEverySeconds = 5;

class WebApi {
  constructor(options = {}) {
    const {
      host = undefined,
      port = null,
      hmiServer = null,
      scheduler = null
    } = options;

    if (!port || !hmiServer || !scheduler) {
      throw new Error('insufficient options provided');
    }

    this._webApi = {
      isActive: false,
      clients: {}
    };

    rebind(this, '_handleIngest', '_handleStream', '_handleSet');

    this._setUpHttpServer(host, port);
    this._setUpHmiService(hmiServer, scheduler);

    this._webApi.log = new Logger(Logger.NAME(libName, `${host}:${port}`));
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
    httpServer.route('/set', this._handleSet);
    this._webApi.httpServer = httpServer;
  }

  _setUpHmiService(hmiServer, scheduler) {
    const hmiService = hmiServer.addService(this._handleIngest);
    new RecurringMoment(
      scheduler,
      every.second(refreshEverySeconds)
    ).on('hit', () => {
      if (this._webApi.isActive) {
        hmiService.getAll();
      }
    });
    this._webApi.hmiService = hmiService;
  }

  _publishMessage(input) {
    const {
      clients
    } = this._webApi;

    const data = JSON.stringify(input, null, null);
    const payload = `data: ${data}\n\n`;

    Object.values(clients).forEach((write) => {
      write(payload);
    });
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
    const { log, clients, hmiService } = this._webApi;
    const { connection: { remoteAddress, remotePort } } = request;
    const { write } = response;

    log.info(`add stream from client "${remoteAddress}:${remotePort}"`);

    const name = `webApi/${remoteAddress}:${remotePort}`;

    clients[name] = write;
    request.on('close', () => {
      log.info(`delete stream from client "${remoteAddress}:${remotePort}"`);
      delete clients[name];
    });

    hmiService.getAll(true);

    return {
      headers: {
        'Content-Type': 'text/event-stream'
      },
      openEnd: true,
      handler: Promise.resolve(
        `: welcome to the event stream\n: client "${name}"\n\n`
      )
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
      handler: Promise.all(setters).then(() => {
        hmiService.getAll();
      }),
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
