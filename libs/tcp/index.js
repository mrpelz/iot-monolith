const { Socket } = require('net');
const EventEmitter = require('events');

const { rebind } = require('../utils/oop');
const { writeNumber } = require('../utils/data');
const { Logger } = require('../log');

const libName = 'tcp';

class PersistentSocket extends EventEmitter {
  constructor(options) {
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
      data = null
    } = keepAlive;

    if ((send || receive) && (!time || !data)) {
      throw new Error('insufficient keepAlive-options provided');
    }

    this._persistentSocket.options = {
      host,
      port,
      keepAlive: {
        send,
        receive,
        time,
        data
      },
      lengthPreamble,
      delimiter
    };

    this._persistentSocket.state = {
      isConnected: false,
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

    this._persistentSocket.log = new Logger(libName, `${host}:${port}`);
  }

  _read(input) {
    this.emit('data', Buffer.from(input));
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

  _onDisconnection() {
    const {
      log,
      state,
      options: {
        keepAlive
      },
      socket
    } = this._persistentSocket;

    if (state.isConnected) {
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

    if (!state.isConnected) {
      log.info('connection try');

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
      socket
    } = this._persistentSocket;

    if (!isConnected) {
      throw new Error('socket is not connected!');
    }

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
    socket.on('error', this._onDisconnection);

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
    socket.removeListener('error', this._onDisconnection);

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
