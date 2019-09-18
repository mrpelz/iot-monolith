const { createSocket } = require('dgram');

const { Transport } = require('./index');
const { humanPayload } = require('../utils/data');
const { rebind } = require('../utils/oop');

/**
 * @typedef Socket
 * @type {import('dgram').Socket}
 */

/**
 * @type {string}
 */
const libName = 'udp transport';

/**
  * @typedef UDPTransportOptions
  * @type {import('./index').TransportOptions & {
    *  host: string,
    *  port: number,
    *  keepAlive?: number
    * }}
    */

/**
 * @class UDPTransport
 */
class UDPTransport extends Transport {

  /**
   * create instance of Transport
   * @param {UDPTransportOptions} options configuration object
   */
  constructor(options) {
    const {
      host,
      port,
      keepAlive = 2000
    } = options;

    super(options);

    this.log.friendlyName(`${host}:${port}`);

    this.state = {
      ...super.state,

      isConnected: /** @type {boolean|null} */ (null),
      shouldBeConnected: false,

      host,
      keepAlive,
      log: this.log.withPrefix(libName),
      port,
      socket: /** @type {Socket|null} */ (null)
    };

    rebind(
      this,
      'write',
      '_connect',
      '_handleMessage',
      '_onConnection',
      '_onDisconnection'
    );

    setInterval(this._connect, Math.round(keepAlive / 2));
  }

  /**
   * handle (dis)connection of socket
   * @returns {void}
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
   * @returns {void}
   */
  _nukeSocket() {
    const { socket } = this.state;
    if (!socket) return;

    socket.removeListener('message', this._handleMessage);
    socket.removeListener('listening', this._onConnection);
    socket.removeListener('close', this._onDisconnection);
    socket.removeListener('error', this._onDisconnection);

    socket.close();

    this.state.socket = null;
  }

  /**
   * create new socket and set up listeners
   * @returns {void}
   */
  _setUpSocket() {
    const socket = createSocket('udp4');

    socket.on('message', this._handleMessage);
    socket.on('listening', this._onConnection);
    socket.on('close', this._onDisconnection);
    socket.on('error', this._onDisconnection);

    this.state.socket = socket;
  }

  /**
   * handle socket connection
   * @returns {void}
   */
  _onConnection() {
    const {
      isConnected,
      log
    } = this.state;

    if (isConnected) return;

    this.state.isConnected = true;

    log.info({
      head: 'is connected',
      value: true
    });

    this._setOnline();
  }

  /**
   * handle socket disconnection
   * @returns {void}
   */
  _onDisconnection() {
    const {
      isConnected,
      log
    } = this.state;

    if (!isConnected) return;

    this._nukeSocket();

    this.state.isConnected = false;

    log.info({
      head: 'is connected',
      value: false
    });

    this._setOffline();
  }

  /**
   * handle incoming messages
   * @param {Buffer} payload message payload
   * @param {import('dgram').RemoteInfo} remoteInfo message rinfo
   * @returns {void}
   */
  _handleMessage(payload, remoteInfo) {
    const {
      host,
      log
    } = this.state;

    if (host !== remoteInfo.address || !remoteInfo.size) return;

    log.debug({
      head: 'msg incoming',
      attachment: humanPayload(payload)
    });

    this._ingestIntoDeviceInstances(null, payload);
  }

  /**
   * connect UDPTransport instance
   * @returns {void}
   */
  connect() {
    this.state.shouldBeConnected = true;

    this.state.log.info({
      head: 'set connect',
      value: true
    });
  }

  /**
   * disconnect UDPTransport instance
   * @returns {void}
   */
  disconnect() {
    this.state.shouldBeConnected = false;

    this.state.log.info({
      head: 'set connect',
      value: false
    });
  }

  /**
   * reconnect UDPTransport instance
   * @returns {void}
   */
  reconnect() {
    this._onDisconnection();
  }

  /**
   * write from Transport instance to network – placeholder
   * @param {unknown} _ identifier buffer (not needed on UDPTransport)
   * @param {Buffer} payload payload buffer
   * @returns {void}
   */
  write(_, payload) {
    const {
      host,
      isConnected,
      log,
      port,
      socket
    } = this.state;

    if (!isConnected) {
      throw new Error('socket is not connected!');
    }

    log.debug(`send ${payload.length} byte payload`);

    log.debug({
      head: 'msg outgoing',
      attachment: humanPayload(payload)
    });

    socket.send(payload, port, host);
  }
}

module.exports = {
  UDPTransport
};
