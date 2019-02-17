const { Socket } = require('net');

const { Base } = require('../base');
const { rebind } = require('../utils/oop');
const { humanPayload, writeNumber, readNumber } = require('../utils/data');
const { Timer } = require('../utils/time');

const libName = 'tcp';

const reconnectionDebounce = 20000;

class PersistentSocket extends Base {
  constructor(options = {}) {
    super();

    this._persistentSocket = {};

    const {
      delimiter = null,
      host = null,
      keepAlive = {},
      lengthPreamble = 0,
      port = null
    } = options;

    if (!host || !port || !(lengthPreamble > 0 || delimiter)) {
      throw new Error('insufficient options provided');
    }

    const {
      data = null,
      receive = false,
      send = false,
      time = null,
      useNative = true
    } = keepAlive;

    if (send && (!time || !data)) {
      throw new Error('insufficient keepAlive-options provided');
    }

    this._persistentSocket.options = {
      host,
      port,
      keepAlive: {
        data,
        receive,
        send,
        time,
        useNative
      },
      lengthPreamble,
      delimiter
    };

    this._persistentSocket.state = {
      buffer: [],
      cache: [],
      connectionTime: 0,
      currentMessageLength: null,
      isConnected: null,
      keepAliveInterval: null,
      messageTickTimeout: null,
      shouldBeConnected: false,
      tcpTimeout: null,
      watcherInterval: null
    };

    rebind(this, '_handleData', '_onConnection', '_onDisconnection');

    this._persistentSocket.socket = new Socket();

    this.log.friendlyName(`${host}:${port}`);
    this._persistentSocket.log = this.log.withPrefix(libName);
  }

  _read(input) {
    const { log } = this._persistentSocket;

    const payload = Buffer.from(input);

    log.debug({
      head: 'payload received',
      attachment: humanPayload(payload)
    });

    this.emit('data', payload);
  }

  _resetReading() {
    const { state } = this._persistentSocket;
    state.messageTick = null;
    state.currentMessageLength = null;
    state.buffer.length = 0;
  }

  _parseLengthMessages() {
    const { state, state: { buffer, cache }, options } = this._persistentSocket;

    while (cache.length) {
      const byte = cache.shift();

      if (!state.messageTick) {
        state.messageTick = setTimeout(
          () => {
            this._resetReading();
          },
          options.keepAlive.time * 2
        );
      }

      if (state.currentMessageLength === null) {
        state.currentMessageLength = byte;
      } else {
        buffer.push(byte);

        if (state.currentMessageLength === buffer.length) {
          if (state.messageTick) {
            clearTimeout(state.messageTick);
            state.messageTick = null;
          }

          this._read(buffer);
          state.currentMessageLength = null;
          buffer.length = 0;
        }
      }
    }
  }

  _parseDelimitedMessages() {
    const { state: { buffer, cache }, options } = this._persistentSocket;

    while (cache.length) {
      const byte = cache.shift();

      if (byte === options.delimiter) {
        this._read(buffer);
        buffer.length = 0;
      } else {
        buffer.push(byte);
      }
    }
  }

  _handleData(data) {
    const { state: { cache }, options } = this._persistentSocket;

    cache.push(...data);

    if (options.keepAlive && options.keepAlive.receive) {
      this._timeoutTick();
    }

    if (data.length) {
      if (options.lengthPreamble) {
        this._parseLengthMessages();
      } else {
        this._parseDelimitedMessages();
      }
    }
  }

  _onConnection() {
    const {
      log,
      state,
      options: {
        keepAlive
      },
      socket
    } = this._persistentSocket;

    const now = Date.now();

    if (!state.isConnected) {
      if (now > (state.connectionTime + reconnectionDebounce)) {
        log.info({
          head: 'is connected',
          value: true,
          telegram: state.isConnected !== null
        });
      }

      state.isConnected = true;
      state.connectionTime = now;

      if (keepAlive && keepAlive.time && keepAlive.useNative) {
        socket.setKeepAlive(true);
        socket.setTimeout(keepAlive.time);
      }

      socket.setNoDelay(true);
      if (keepAlive && keepAlive.receive) {
        this._timeoutTick();
      }

      if (keepAlive && keepAlive.send) {
        state.keepAliveInterval = setInterval(() => {
          this.write(keepAlive.data);
        }, keepAlive.time);
      }

      socket.on('data', this._handleData);

      this.emit('connect');
    }
  }

  _onDisconnection(error) {
    const {
      log,
      state,
      options: {
        keepAlive
      },
      socket
    } = this._persistentSocket;

    if (state.isConnected) {
      if (Date.now() > (state.connectionTime + reconnectionDebounce)) {
        if (state.shouldBeConnected) {
          log.error({
            head: 'unexpected disconnect',
            attachment: null || (error && error.message)
          });
        }

        log.info({
          head: 'is connected',
          value: false
        });
      }

      state.isConnected = false;

      if (keepAlive && keepAlive.receive) {
        this._timeoutTick(true);
      }

      if (state.keepAliveInterval) {
        clearInterval(state.keepAliveInterval);
      }

      socket.removeListener('data', this._handleData);

      socket.end();
      socket.destroy();

      this.emit('disconnect');
    }
  }

  _doConnect() {
    const {
      log,
      state,
      options: {
        host,
        port
      },
      socket
    } = this._persistentSocket;

    if (!state.isConnected && state.shouldBeConnected) {
      log.debug('connection try');

      socket.connect({
        host,
        port
      });
    }
  }

  _timeoutTick(stop = false) {
    const { log, state, options: { keepAlive } } = this._persistentSocket;

    if (state.tcpTimeout) {
      clearTimeout(state.tcpTimeout);
      state.tcpTimeout = null;
    }

    if (!stop) {
      state.tcpTimeout = setTimeout(() => {
        state.tcpTimeout = null;

        log.notice('timeout');

        this._onDisconnection();
      }, Math.round(keepAlive.time * 3));
    }
  }

  write(input) {
    const {
      state: {
        isConnected
      },
      options: {
        lengthPreamble,
        delimiter
      },
      log,
      socket
    } = this._persistentSocket;

    if (!isConnected) {
      throw new Error('socket is not connected!');
    }

    log.debug({
      head: 'payload send',
      attachment: humanPayload(input)
    });

    socket.write(Buffer.concat(lengthPreamble ? [
      writeNumber(input.length, lengthPreamble),
      input
    ] : [
      input,
      Buffer.from([delimiter])
    ]));
  }

  connect() {
    const {
      log,
      state,
      options: {
        keepAlive
      },
      socket
    } = this._persistentSocket;

    log.info({
      head: 'set connect',
      value: true
    });

    socket.on('connect', this._onConnection);
    socket.on('end', this._onDisconnection);
    socket.on('timeout', this._onDisconnection);
    socket.on('error', this._onDisconnection);

    state.shouldBeConnected = true;

    this._doConnect();

    if (keepAlive && keepAlive.time) {
      if (state.watcherInterval) {
        clearInterval(state.watcherInterval);
      }
      state.watcherInterval = setInterval(() => {
        this._doConnect();
      }, keepAlive.time);
    }
  }

  disconnect() {
    const { log, state, socket } = this._persistentSocket;

    log.info({
      head: 'set connect',
      value: false
    });

    if (state.watcherInterval) {
      clearInterval(state.watcherInterval);
      state.watcherInterval = null;
    }

    socket.removeListener('connect', this._onConnection);
    socket.removeListener('end', this._onDisconnection);
    socket.removeListener('timeout', this._onDisconnection);
    socket.removeListener('error', this._onDisconnection);

    state.shouldBeConnected = false;

    this._onDisconnection();
  }

  // Public methods:
  // connect
  // disconnect
  // write
}

class ReliableSocket extends Base {
  constructor(options = {}) {
    super();

    const {
      host = null,
      port = null,
      lengthPreamble = 1,
      keepAlive = 2000
    } = options;

    if (!host || !port || !lengthPreamble) {
      throw new Error('insufficient options provided');
    }

    this.log.friendlyName(`${host}:${port}`);

    this._reliableSocket = {
      options: {
        host,
        port,
        lengthPreamble,
        keepAlive
      },
      state: {
        connectionTime: 0,
        currentLength: 0,
        isConnected: null,
        shouldBeConnected: false
      },
      socket: new Socket(),
      messageTimer: new Timer(keepAlive * 2),
      disconnectTimer: new Timer(keepAlive * 10),
      log: this.log.withPrefix(libName)
    };

    rebind(
      this,
      '_connect',
      '_handleReadable',
      '_notifyDisconnect',
      '_onConnection',
      '_onDisconnection',
      '_sendKeepAlive'
    );

    this._setUpSocket();
  }

  _connect() {
    const {
      options: {
        host,
        port
      },
      state: {
        isConnected,
        shouldBeConnected
      },
      socket
    } = this._reliableSocket;

    if (shouldBeConnected && !isConnected && !socket.connecting) {
      socket.connect({ host, port });
    } else if (!shouldBeConnected && isConnected) {
      socket.end();
    }
  }

  _handleReadable() {
    const { messageTimer } = this._reliableSocket;

    messageTimer.stop();

    let remainder = true;
    while (remainder) {
      remainder = this._read();
    }

    messageTimer.start();
  }

  _notifyDisconnect() {
    const { log } = this._reliableSocket;
    log.error('unrecovered socket disconnect');
  }

  _onConnection() {
    const {
      state: {
        isConnected
      },
      disconnectTimer
    } = this._reliableSocket;

    if (isConnected) return;

    this._reliableSocket.state.connectionTime = Date.now();

    disconnectTimer.stop();

    this._reliableSocket.state.isConnected = true;
    this.emit('connect');
  }

  _onDisconnection() {
    const {
      state: {
        isConnected,
        shouldBeConnected
      },
      socket,
      messageTimer,
      disconnectTimer
    } = this._reliableSocket;

    if (!isConnected) return;

    messageTimer.stop();
    socket.destroy();

    if (shouldBeConnected) {
      disconnectTimer.start();
    }

    this._reliableSocket.state.isConnected = false;
    this.emit('disconnect');
  }

  _read() {
    const {
      socket,
      options: {
        lengthPreamble
      }
    } = this._reliableSocket;

    if (this._reliableSocket.state.currentLength) {
      const bodyPayload = socket.read(this._reliableSocket.state.currentLength);
      if (!bodyPayload) return false;

      this._reliableSocket.state.currentLength = 0;
      this.emit('data', bodyPayload);

      return true;
    }

    const lengthPayload = socket.read(lengthPreamble);
    if (!lengthPayload) return false;

    this._reliableSocket.state.currentLength = readNumber(lengthPayload, lengthPreamble);

    return true;
  }

  _sendKeepAlive() {
    if (!this._reliableSocket.state.isConnected) return;
    this.write(Buffer.from([0xFF]));
  }

  _setUpSocket() {
    const {
      options: {
        keepAlive
      },
      socket,
      messageTimer,
      disconnectTimer
    } = this._reliableSocket;

    socket.setNoDelay(true);

    if (keepAlive) {
      socket.setKeepAlive(true, keepAlive);
      socket.setTimeout(keepAlive * 2);

      setInterval(this._connect, Math.round(keepAlive / 2));
      setInterval(this._sendKeepAlive, keepAlive);
    }

    socket.on('readable', this._handleReadable);

    socket.on('connect', this._onConnection);

    socket.on('end', this._onDisconnection);
    socket.on('timeout', this._onDisconnection);
    socket.on('error', this._onDisconnection);
    messageTimer.on('hit', this._onDisconnection);

    disconnectTimer.on('hit', this._notifyDisconnect);
  }

  connect() {
    this._reliableSocket.state.shouldBeConnected = true;
    this._connect();
  }

  disconnect() {
    this._reliableSocket.state.shouldBeConnected = false;
    this._connect();
  }

  write(input) {
    const {
      options: {
        lengthPreamble
      },
      state: {
        isConnected
      },
      socket
    } = this._reliableSocket;

    if (!isConnected) {
      throw new Error('socket is not connected!');
    }

    socket.write(Buffer.concat([
      writeNumber(input.length, lengthPreamble),
      input
    ]));
  }
}

module.exports = {
  PersistentSocket,
  ReliableSocket
};
