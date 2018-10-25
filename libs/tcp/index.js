const { Socket } = require('net');

const { Base } = require('../base');
const { rebind } = require('../utils/oop');
const { humanPayload, writeNumber } = require('../utils/data');

const libName = 'tcp';

class PersistentSocket extends Base {
  constructor(options = {}) {
    super();

    this._persistentSocket = {};

    const {
      host = null,
      port = null,
      keepAlive = {},
      lengthPreamble = 0,
      delimiter = null
    } = options;

    if (!host || !port || !(lengthPreamble > 0 || delimiter)) {
      throw new Error('insufficient options provided');
    }

    const {
      send = false,
      receive = false,
      time = null,
      data = null,
      useNative = true
    } = keepAlive;

    if (send && (!time || !data)) {
      throw new Error('insufficient keepAlive-options provided');
    }

    this._persistentSocket.options = {
      host,
      port,
      keepAlive: {
        send,
        receive,
        time,
        data,
        useNative
      },
      lengthPreamble,
      delimiter
    };

    this._persistentSocket.state = {
      isConnected: false,
      shouldBeConnected: false,
      keepAliveInterval: null,
      watcherInterval: null,
      tcpTimeout: null,
      messageTickTimeout: null,
      currentMessageLength: null,
      cache: [],
      buffer: []
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

    if (!state.isConnected) {
      log.info({
        head: 'is connected',
        value: true
      });

      state.isConnected = true;

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

  _timeoutTick(stop) {
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
      }, Math.round(keepAlive.time * 1.5));
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

module.exports = {
  PersistentSocket
};
