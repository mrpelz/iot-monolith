const { Socket } = require('net');

const { Transport } = require('./index');
const { humanPayload, writeNumber, readNumber } = require('../utils/data');
const { Timer } = require('../utils/time');
const { rebind } = require('../utils/oop');

const libName = 'tcp transport';

class TCPTransport extends Transport {
  constructor(options = {}) {
    const {
      host,
      port,
      lengthPreamble = 1,
      keepAlive = 2000
    } = options;

    if (!host || !port || !lengthPreamble) {
      throw new Error('insufficient options provided');
    }

    super(options);

    this.log.friendlyName(`${host}:${port}`);

    Object.assign(this.state, {
      connectionTime: 0,
      currentLength: 0,
      isConnected: null,
      shouldBeConnected: false,

      host,
      keepAlive,
      lengthPreamble,
      log: this.log.withPrefix(libName),
      port,
      socket: null,

      messageTimer: new Timer(keepAlive * 2)
    });

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

  _onDisconnection() {
    const {
      isConnected,
      log,
      messageTimer,
    } = this._reliableSocket;

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

  _handleReadable() {
    let remainder = true;
    while (remainder) {
      remainder = this._read();
    }
  }

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

      this._writeToDeviceInstances(null, payload);

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

  // this overwrites Transport method
  connect() {
    this.state.shouldBeConnected = true;

    this.state.log.info({
      head: 'set connect',
      value: true
    });
  }

  // this overwrites Transport method
  disconnect() {
    this.state.shouldBeConnected = false;

    this.state.log.info({
      head: 'set connect',
      value: false
    });
  }

  // this overwrites Transport method
  reconnect() {
    this._onDisconnection();
  }

  // this overwrites Transport method
  write(_, payload) {
    const {
      lengthPreamble,
      isConnected,
      socket,
      log
    } = this._reliableSocket;

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
