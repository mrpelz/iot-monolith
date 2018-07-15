import { rebind } from '../utils/oop';
import { writeNumber } from '../utils/conversion';
import { Logger } from '../log';

const net = require('net');
const EventEmitter = require('events');

const logPrefix = 'tcp';

const { log } = new Logger(logPrefix);

export class PersistentSocket extends EventEmitter {
  constructor(options) {
    super();

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

    this._options = {
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

    this._state = {
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

    this._socket = new net.Socket();
  }

  _read(input) {
    this.emit('data', Buffer.from(input));
  }

  _resetReading() {
    const { _state } = this;
    _state.messageTick = null;
    _state.currentMessageLength = null;
    _state.buffer.length = 0;
  }

  _parseLengthMessages() {
    const { _state, _state: { buffer, cache }, _options } = this;

    while (_state.cache.length) {
      const byte = cache.shift();

      if (!_state.messageTick) {
        _state.messageTick = setTimeout(
          () => {
            this._resetReading();
          },
          _options.keepAlive.time * 2
        );
      }

      if (_state.currentMessageLength === null) {
        _state.currentMessageLength = byte;
      } else {
        buffer.push(byte);

        if (_state.currentMessageLength === buffer.length) {
          if (_state.messageTick) {
            clearTimeout(_state.messageTick);
            _state.messageTick = null;
          }

          this._read(buffer);
          _state.currentMessageLength = null;
          buffer.length = 0;
        }
      }
    }
  }

  _parseDelimitedMessages() {
    const { _state: { buffer, cache }, _options } = this;

    while (cache.length) {
      const byte = cache.shift();

      if (byte === _options.delimiter) {
        this._read(this.buffer);
        buffer.length = 0;
      } else {
        buffer.push(byte);
      }
    }
  }

  _handleData(data) {
    const { _state: { cache }, _options } = this;

    cache.push(...data);

    if (_options.keepAlive && _options.keepAlive.receive) {
      this._timeoutTick();
    }

    if (data.length) {
      if (_options.lengthPreamble) {
        this._parseLengthMessages();
      } else {
        this._parseDelimitedMessages();
      }
    }
  }

  _handleConnection() {
    const { _state, _options: { host, port, keepAlive }, _socket } = this;

    if (!_state.isConnected) {
      log(`socket "${host}:${port}" is connected`, 6, {
        TYPE: 'is_connected',
        HOST: host,
        PORT: port
      });

      _state.isConnected = true;

      _socket.setNoDelay(true);
      if (keepAlive && keepAlive.receive) {
        this._timeoutTick();
      }

      if (keepAlive && keepAlive.send) {
        _state.keepAliveInterval = setInterval(() => {
          this.write(keepAlive.data);
        }, keepAlive.time);
      }

      _socket.on('data', this._handleData);

      this.emit('connect');
    }
  }

  _handleDisconnection() {
    const { _state, _options: { host, port, keepAlive }, _socket } = this;

    if (_state.isConnected) {
      log(`socket "${host}:${port}" is disconnected`, 6, {
        TYPE: 'is_connected',
        HOST: host,
        PORT: port
      });

      _state.isConnected = false;

      if (keepAlive && keepAlive.receive) {
        this._timeoutTick(true);
      }

      if (_state.keepAliveInterval) {
        clearInterval(_state.keepAliveInterval);
      }

      _socket.removeListener('data', this._handleData);

      _socket.destroy();

      this.emit('disconnect');
    }
  }

  _doConnect() {
    const { _state, _options: { host, port }, _socket } = this;

    if (!_state.isConnected) {
      log(`trying to connect socket "${host}:${port}"`, 6, {
        TYPE: 'do_connect',
        HOST: host,
        PORT: port
      });

      _socket.connect({
        host,
        port
      });
    }
  }

  _timeoutTick(stop) {
    const { _state, _options: { host, port, keepAlive } } = this;

    if (_state.tcpTimeout) {
      clearTimeout(_state.tcpTimeout);
      _state.tcpTimeout = null;
    }

    if (!stop) {
      _state.tcpTimeout = setTimeout(() => {
        _state.tcpTimeout = null;

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
    const { _state, _options: { lengthPreamble, delimiter }, _socket } = this;

    if (!_state.isConnected) {
      throw new Error('socket is not connected!');
    }

    _socket.write(Buffer.concat(lengthPreamble ? [
      writeNumber(input.length, lengthPreamble),
      input
    ] : [
      input,
      Buffer.from([delimiter])
    ]));
  }

  connect() {
    const { _state, _options: { host, port, keepAlive }, _socket } = this;

    log(`connecting socket "${host}:${port}"`, 6, {
      TYPE: 'connect',
      HOST: host,
      PORT: port
    });

    _socket.on('connect', this._handleConnection);
    _socket.on('end', this._handleDisconnection);
    _socket.on('error', this._handleDisconnection);

    this._doConnect();

    if (keepAlive && keepAlive.time) {
      if (_state.watcherInterval) {
        clearInterval(_state.watcherInterval);
      }
      _state.watcherInterval = setInterval(() => {
        this._doConnect();
      }, keepAlive.time);
    }
  }

  disconnect() {
    const { _state, _options: { host, port }, _socket } = this;

    log(`disconnecting socket "${host}:${port}"`, 6, {
      TYPE: 'disconnect',
      HOST: host,
      PORT: port
    });

    if (_state.watcherInterval) {
      clearInterval(_state.watcherInterval);
      _state.watcherInterval = null;
    }

    _socket.removeListener('connect', this._handleConnection);
    _socket.removeListener('end', this._handleDisconnection);
    _socket.removeListener('error', this._handleDisconnection);

    this._handleDisconnection();
  }

  // Public methods:
  // connect
  // disconnect
  // write
}
