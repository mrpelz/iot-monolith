const { Socket } = require('net');

const { Transport } = require('./index');
const { humanPayload, writeNumber, readNumber } = require('../utils/data');
const { Timer } = require('../utils/time');
const { rebind } = require('../utils/oop');

/**
 * @type {string}
 */
const libName = 'tcp transport';

/**
  * @typedef TCPTransportOptions
  * @type {import('./index').TransportOptions & {
    *  host: string,
    *  port: number,
    *  lengthPreamble?: number,
    *  keepAlive?: number
    * }}
    */

/**
 * @class TCPTransport
 */
class TCPTransport extends Transport {

  /**
   * create instance of Transport
   * @param {TCPTransportOptions} options configuration object
   */
  constructor(options) {
    const {
      host,
      port,
      lengthPreamble = 1,
      keepAlive = 2000
    } = options;

    if (!lengthPreamble) {
      throw new Error('insufficient options provided');
    }

    super(options);

    this.log.friendlyName(`${host}:${port}`);

    this.state = {
      ...super.state,

      connectionTime: 0,
      currentLength: 0,
      isConnected: /** @type {boolean|null} */ (null),
      shouldBeConnected: false,

      host,
      keepAlive,
      lengthPreamble,
      log: this.log.withPrefix(libName),
      port,
      socket: /** @type {Socket|null} */ (null),

      messageTimer: new Timer(keepAlive * 2)
    };

    rebind(
      this,
      'write',
      '_connect',
      '_handleReadable',
      '_onConnection',
      '_onDisconnection'
    );

    setInterval(this._connect, Math.round(keepAlive / 2));

    this.state.messageTimer.on('hit', this._onDisconnection);
  }

  /**
   * handle (dis)connection of socket
   */
  _connect() {
    const {
      isConnected,
      log,
      shouldBeConnected
    } = this.state;

    log.debug('connection/disconnection handling');

    if (shouldBeConnected && !isConnected) {
      this._nukeSocket();
      this._setUpSocket();
    } else if (!shouldBeConnected && isConnected) {
      this._nukeSocket();
    }
  }

  /**
   * destroy old socket and remove listeners
   */
  _nukeSocket() {
    const { socket } = this.state;
    if (!socket) return;

    socket.removeListener('readable', this._handleReadable);
    socket.removeListener('connect', this._onConnection);
    socket.removeListener('end', this._onDisconnection);
    socket.removeListener('timeout', this._onDisconnection);
    socket.removeListener('error', this._onDisconnection);

    socket.end();
    socket.destroy();

    this.state.socket = null;
  }

  /**
   * create new socket and set up listeners
   */
  _setUpSocket() {
    const {
      host,
      keepAlive,
      port
    } = this.state;

    const socket = new Socket();
    socket.connect({ host, port });

    socket.setNoDelay(true);

    if (keepAlive) {
      socket.setKeepAlive(true, keepAlive);
      socket.setTimeout(keepAlive * 2);
    }

    socket.on('readable', this._handleReadable);
    socket.on('connect', this._onConnection);
    socket.on('end', this._onDisconnection);
    socket.on('timeout', this._onDisconnection);
    socket.on('error', this._onDisconnection);

    this.state.socket = socket;
  }

  /**
   * handle socket connection
   */
  _onConnection() {
    const {
      isConnected,
      log
    } = this.state;

    if (isConnected) return;

    this.state.connectionTime = Date.now();

    this.state.isConnected = true;

    log.info({
      head: 'is connected',
      value: true
    });

    this._setOnline();
  }

  /**
   * handle socket disconnection
   */
  _onDisconnection() {
    const {
      isConnected,
      log,
      messageTimer,
    } = this.state;

    if (!isConnected) return;

    messageTimer.stop();

    this._nukeSocket();

    this.state.currentLength = 0;
    this.state.isConnected = false;

    log.info({
      head: 'is connected',
      value: false
    });

    this._setOffline();
  }

  /**
   * handle readable (incoming) bytes from socket
   */
  _handleReadable() {
    let remainder = true;
    while (remainder) {
      remainder = this._read();
    }
  }

  /**
   * read the right amount of bytes from socket
   * @returns {boolean} if there are any bytes left to read
   */
  _read() {
    const {
      currentLength,
      lengthPreamble,
      log,
      messageTimer,
      socket
    } = this.state;

    if (currentLength) {
      const payload = socket.read(currentLength);
      if (!payload) return false;

      this.state.currentLength = 0;

      messageTimer.stop();

      log.debug({
        head: 'msg incoming',
        attachment: humanPayload(payload)
      });

      this._ingestIntoDeviceInstances(null, payload);

      return true;
    }

    const length = socket.read(lengthPreamble);
    if (!length) return false;

    this.state.currentLength = readNumber(length, lengthPreamble);

    messageTimer.start();

    if (this.state.currentLength > 5) {
      log.error(`unusual large message: ${this.state.currentLength} bytes`);
    }

    log.debug(`receive ${this.state.currentLength} byte payload`);

    return true;
  }

  /**
   * connect TCPTransport instance
   */
  connect() {
    this.state.shouldBeConnected = true;

    this._connect();

    this.state.log.info({
      head: 'set connect',
      value: true
    });
  }

  /**
   * disconnect TCPTransport instance
   */
  disconnect() {
    this.state.shouldBeConnected = false;

    this._connect();

    this.state.log.info({
      head: 'set connect',
      value: false
    });
  }

  /**
   * reconnect TCPTransport instance
   */
  reconnect() {
    this._onDisconnection();
  }

  /**
   * write from Transport instance to network – placeholder
   * @param {unknown} _ identifier buffer (not needed on TCPTransport)
   * @param {Buffer} payload payload buffer
   */
  writeToTransport(_, payload) {
    const {
      lengthPreamble,
      isConnected,
      socket,
      log
    } = this.state;

    if (!isConnected) {
      throw new Error('socket is not connected!');
    }

    log.debug(`send ${payload.length} byte payload`);

    log.debug({
      head: 'msg outgoing',
      attachment: humanPayload(payload)
    });

    socket.write(Buffer.concat([
      writeNumber(payload.length, lengthPreamble),
      payload
    ]));
  }
}

module.exports = {
  TCPTransport
};
