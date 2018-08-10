const { Server } = require('http');
const EventEmitter = require('events');

const { rebind } = require('../utils/oop');
const { Logger } = require('../log');

const libName = 'http-server';

class HttpServer extends EventEmitter {
  constructor(options) {
    super();

    this._httpServer = {};

    const {
      host = '0.0.0.0',
      port = null
    } = options;

    if (!host || !port) {
      throw new Error('insufficient options provided');
    }

    this._httpServer.options = {
      host,
      port
    };

    rebind(this, '_handleRequest', '_onListening');

    this._httpServer.server = new Server();

    this._httpServer.log = new Logger(libName, `${host}:${port}`);
  }

  onListening() {
    const { log } = this._httpServer;

    log.info({
      head: 'listening',
      value: true
    });

    this.emit('listening');
  }
}

module.exports = {
  HttpServer
};
