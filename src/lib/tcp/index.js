import { humanPayload, readNumber, writeNumber } from '../utils/data.js';
import { Base } from '../base/index.js';
import { Socket } from 'net';
import { Timer } from '../utils/time.js';
import { rebind } from '../utils/oop.js';

const libName = 'tcp';

const reconnectionDebounce = 20000;

export class PersistentSocket extends Base {
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

  reconnect() {
    this._onDisconnection();
  }

  // Public methods:
  // connect
  // disconnect
  // reconnect
  // write
}

export class ReliableSocket extends Base {
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
      socket: null,
      keepAliveTimer: new Timer(keepAlive * 4),
      messageTimer: new Timer(keepAlive * 2),
      disconnectTimer: new Timer(keepAlive * 20),
      connectDebounceTimer: new Timer(keepAlive),
      log: this.log.withPrefix(libName)
    };

    rebind(
      this,
      '_connect',
      '_handleReadable',
      '_notifyConnect',
      '_notifyDisconnect',
      '_onConnection',
      '_onDisconnection',
      '_sendKeepAlive'
    );

    this._init();
  }

  _init() {
    const {
      options: {
        keepAlive
      },
      keepAliveTimer,
      messageTimer,
      disconnectTimer,
      connectDebounceTimer
    } = this._reliableSocket;

    setInterval(this._connect, Math.round(keepAlive / 2));
    setInterval(this._sendKeepAlive, keepAlive);

    keepAliveTimer.on('hit', this._onDisconnection);
    messageTimer.on('hit', this._onDisconnection);

    connectDebounceTimer.on('hit', this._notifyConnect);
    disconnectTimer.on('hit', this._notifyDisconnect);
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
      log
    } = this._reliableSocket;

    log.debug('connection/disconnection handling');

    if (shouldBeConnected && !isConnected) {
      this._nukeSocket();
      const newSocket = new Socket();
      newSocket.connect({ host, port });
      this._reliableSocket.socket = newSocket;
      this._setUpSocket();
    } else if (!shouldBeConnected && isConnected) {
      this._nukeSocket();
    }
  }

  _handleReadable() {
    const { keepAliveTimer } = this._reliableSocket;

    keepAliveTimer.start();

    let remainder = true;
    while (remainder) {
      remainder = this._read();
    }
  }

  _notifyConnect() {
    const { log } = this._reliableSocket;
    log.info('debounced socket connect');

    this.emit('reliableConnect');
  }

  _notifyDisconnect() {
    const { log } = this._reliableSocket;
    log.error('unrecovered socket disconnect');

    this.emit('reliableDisconnect');
  }

  _nukeSocket() {
    const { socket } = this._reliableSocket;
    if (!socket) return;

    socket.removeListener('readable', this._handleReadable);
    socket.removeListener('connect', this._onConnection);
    socket.removeListener('end', this._onDisconnection);
    socket.removeListener('timeout', this._onDisconnection);
    socket.removeListener('error', this._onDisconnection);

    socket.end();
    socket.destroy();

    this._reliableSocket.socket = null;
  }

  _onConnection() {
    const {
      state: {
        isConnected
      },
      disconnectTimer,
      connectDebounceTimer,
      keepAliveTimer,
      log
    } = this._reliableSocket;

    if (isConnected) return;

    this._reliableSocket.state.connectionTime = Date.now();

    connectDebounceTimer.start();
    disconnectTimer.stop();
    keepAliveTimer.start();

    this._reliableSocket.state.isConnected = true;

    log.info({
      head: 'is connected',
      value: true
    });

    this.emit('connect');
  }

  _onDisconnection() {
    const {
      state: {
        isConnected,
        shouldBeConnected
      },
      messageTimer,
      disconnectTimer,
      connectDebounceTimer,
      keepAliveTimer,
      log
    } = this._reliableSocket;

    if (!isConnected) return;

    connectDebounceTimer.stop();
    messageTimer.stop();
    keepAliveTimer.stop();

    this._nukeSocket();

    if (shouldBeConnected) {
      disconnectTimer.start();
    }

    this._reliableSocket.state.currentLength = 0;
    this._reliableSocket.state.isConnected = false;

    log.info({
      head: 'is connected',
      value: false
    });

    this.emit('disconnect');
  }

  _read() {
    const {
      messageTimer,
      socket,
      options: {
        lengthPreamble
      },
      log
    } = this._reliableSocket;

    if (this._reliableSocket.state.currentLength) {
      const bodyPayload = socket.read(this._reliableSocket.state.currentLength);
      if (!bodyPayload) return false;

      this._reliableSocket.state.currentLength = 0;

      messageTimer.stop();

      log.debug({
        head: 'msg incoming',
        attachment: humanPayload(bodyPayload)
      });

      this.emit('data', bodyPayload);

      return true;
    }

    const lengthPayload = socket.read(lengthPreamble);
    if (!lengthPayload) return false;

    this._reliableSocket.state.currentLength = readNumber(lengthPayload, lengthPreamble);

    messageTimer.start();

    if (this._reliableSocket.state.currentLength > 5) {
      log.error(`message length > 5 bytes: ${this._reliableSocket.state.currentLength} bytes`);
    }

    log.debug(`receive ${this._reliableSocket.state.currentLength} byte payload`);

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
    } = this._reliableSocket;

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
  }

  connect() {
    this._reliableSocket.state.shouldBeConnected = true;

    this._reliableSocket.log.info({
      head: 'set connect',
      value: true
    });

    this._connect();
  }

  disconnect() {
    this._reliableSocket.state.shouldBeConnected = false;

    this._reliableSocket.log.info({
      head: 'set connect',
      value: false
    });

    this._connect();
  }

  reconnect() {
    this._onDisconnection();
  }

  write(input) {
    const {
      options: {
        lengthPreamble
      },
      state: {
        isConnected
      },
      socket,
      log
    } = this._reliableSocket;

    if (!isConnected) {
      throw new Error('socket is not connected!');
    }

    log.debug(`send ${input.length} byte payload`);

    log.debug({
      head: 'msg outgoing',
      attachment: humanPayload(input)
    });

    socket.write(Buffer.concat([
      writeNumber(input.length, lengthPreamble),
      input
    ]));
  }
}
