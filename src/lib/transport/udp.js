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
 *  keepAlive?: number,
 *  sequenceHandling?: boolean
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
      keepAlive = 2000,
      sequenceHandling = false
    } = options;

    super(options);

    this.log.friendlyName(`${host}:${port}`);

    this.state = {
      ...super.state,

      isConnected: /** @type {boolean|null} */ (null),
      messageIncomingSequence: 0,
      messageOutgoingSequence: 0,
      shouldBeConnected: false,

      host,
      keepAlive,
      log: this.log.withPrefix(libName),
      port,
      sequenceHandling,
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
   * manage sequence number to prepend to outgoing messages
   * @returns {number} sequence number
   */
  _getOutgoingSequence() {
    this.state.messageOutgoingSequence = this.state.messageOutgoingSequence === 0xff
      ? 0
      : (this.state.messageOutgoingSequence += 1);

    return this.state.messageOutgoingSequence;
  }

  /**
   * manage sequence number to check from incoming messages
   * @param {number} sequence sequence number
   * @returns {boolean} if message is valid
   */
  _checkIncomingSequence(sequence) {
    if (this.state.messageIncomingSequence === 0xff && sequence !== 0) return false;
    if (sequence < this.state.messageIncomingSequence) return false;

    this.state.messageIncomingSequence = sequence;

    return true;
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

    socket.removeListener('message', this._handleMessage);
    socket.removeListener('listening', this._onConnection);
    socket.removeListener('close', this._onDisconnection);
    socket.removeListener('error', this._onDisconnection);

    socket.close();

    this.state.socket = null;
  }

  /**
   * create new socket and set up listeners
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
   * @param {Buffer} message message
   * @param {import('dgram').RemoteInfo} remoteInfo message rinfo
   */
  _handleMessage(message, remoteInfo) {
    const {
      host,
      log,
      sequenceHandling
    } = this.state;

    if (host !== remoteInfo.address || !remoteInfo.size) return;

    /**
     * @type {Buffer}
     */
    let payload;

    if (sequenceHandling) {
      const sequence = message.subarray(0, 1);
      payload = message.subarray(1);

      if (!this._checkIncomingSequence(sequence.readUInt8(0))) return;
    } else {
      payload = message;
    }

    log.debug({
      head: 'msg incoming',
      attachment: humanPayload(payload)
    });

    this._ingestIntoDeviceInstances(null, payload);
  }

  /**
   * connect UDPTransport instance
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
   * disconnect UDPTransport instance
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
   * reconnect UDPTransport instance
   */
  reconnect() {
    this._onDisconnection();
  }

  /**
   * write from Transport instance to network – placeholder
   * @param {unknown} _ identifier buffer (not needed on UDPTransport)
   * @param {Buffer} payload payload buffer
   */
  writeToTransport(_, payload) {
    const {
      host,
      isConnected,
      log,
      port,
      sequenceHandling,
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

    socket.send(
      sequenceHandling ? Buffer.concat([Buffer.from([this._getOutgoingSequence()]), payload]) : payload,
      port,
      host
    );
  }
}

module.exports = {
  UDPTransport
};
