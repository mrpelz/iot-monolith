const net = require('net');
const EventEmitter = require('events');

const { rebind } = require('../utils/oop');
const { writeNumber } = require('../utils/data');
const { Logger } = require('../log');

const logPrefix = 'tcp';
const { log } = new Logger(logPrefix);

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

    rebind(this, '_handleData', '_handleConnection', '_handleDisconnection');

    this._persistentSocket.socket = new net.Socket();
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

  _handleConnection() {
    const { state, options: { host, port, keepAlive }, socket } = this._persistentSocket;

    if (!state.isConnected) {
      log(`socket "${host}:${port}" is connected`, 6, {
        TYPE: 'is_connected',
        HOST: host,
        PORT: port
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

  _handleDisconnection() {
    const { state, options: { host, port, keepAlive }, socket } = this._persistentSocket;

    if (state.isConnected) {
      log(`socket "${host}:${port}" is disconnected`, 6, {
        TYPE: 'is_connected',
        HOST: host,
        PORT: port
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
    const { state, options: { host, port }, socket } = this._persistentSocket;

    if (!state.isConnected) {
      log(`trying to connect socket "${host}:${port}"`, 6, {
        TYPE: 'do_connect',
        HOST: host,
        PORT: port
      });

      socket.connect({
        host,
        port
      });
    }
  }

  _timeoutTick(stop) {
    const { state, options: { host, port, keepAlive } } = this._persistentSocket;

    if (state.tcpTimeout) {
      clearTimeout(state.tcpTimeout);
      state.tcpTimeout = null;
    }

    if (!stop) {
      state.tcpTimeout = setTimeout(() => {
        state.tcpTimeout = null;

        log(`timeout on socket "${host}:${port}"`, 6, {
          TYPE: 'connection_timeout',
          HOST: host,
          PORT: port
        });

        this._handleDisconnection();
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
    const { state, options: { host, port, keepAlive }, socket } = this._persistentSocket;

    log(`connecting socket "${host}:${port}"`, 6, {
      TYPE: 'connect',
      HOST: host,
      PORT: port
    });

    socket.on('connect', this._handleConnection);
    socket.on('end', this._handleDisconnection);
    socket.on('error', this._handleDisconnection);

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
    const { state, options: { host, port }, socket } = this._persistentSocket;

    log(`disconnecting socket "${host}:${port}"`, 6, {
      TYPE: 'disconnect',
      HOST: host,
      PORT: port
    });

    if (state.watcherInterval) {
      clearInterval(state.watcherInterval);
      state.watcherInterval = null;
    }

    socket.removeListener('connect', this._handleConnection);
    socket.removeListener('end', this._handleDisconnection);
    socket.removeListener('error', this._handleDisconnection);

    this._handleDisconnection();
  }

  // Public methods:
  // connect
  // disconnect
  // write
}

module.exports = {
  PersistentSocket
};
