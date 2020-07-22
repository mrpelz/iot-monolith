import { Transport } from './index.js';
import { createSocket } from 'dgram';
import { humanPayload } from '../utils/data.js';
import { rebind } from '../utils/oop.js';

// PACKET FORMAT
//
// request, without sequence number (default, to device):
// |                      |                                    |                      |
// | request id (1 octet) | service id (1–n octets, default 1) | payload (0–n octets) |
// |            0x01–0xFF |                          0x00–0xFF |                      |
// |                      |                                    |                      |
//
// response, without sequence number (default, from device):
// |                      |                      |
// | request id (1 octet) | payload (0–n octets) |
// |            0x01–0xFF |                      |
// |                      |                      |
//
// event, without sequence number (default, from device):
// |                      |                                  |                      |
// | request id (1 octet) | event id (1–n octets, default 1) | payload (0–n octets) |
// |          always 0x00 |                        0x00–0xFF |                      |
// |                      |                                  |                      |
//
// request, with sequence number (to device):
// |                           |                      |                                    |                      |
// | sequence number (1 octet) | request id (1 octet) | service id (1–n octets, default 1) | payload (0–n octets) |
// |                 0x00–0xFF |            0x01–0xFF |                          0x00–0xFF |                      |
// |                           |                      |                                    |                      |
//
// response, with sequence number (from device):
// |                           |                      |                      |
// | sequence number (1 octet) | request id (1 octet) | payload (0–n octets) |
// |                 0x00–0xFF |            0x01–0xFF |                      |
// |                           |                      |                      |
//
// event, with sequence number (from device):
// |                           |                      |                                  |                      |
// | sequence number (1 octet) | request id (1 octet) | event id (1–n octets, default 1) | payload (0–n octets) |
// |                 0x00–0xFF |          always 0x00 |                        0x00–0xFF |                      |
// |                           |                      |                                  |                      |
//

/**
 * @typedef Socket
 * @type {import('dgram').Socket}
 */

const libName = 'udp transport';
const sequenceRepeatOutgoing = 5;

/**
 * @typedef UDPTransportOptions
 * @type {import('./index.js').TransportOptions & {
 *  host: string,
 *  port: number,
 *  keepAlive?: number,
 *  sequenceHandling?: boolean
 * }}
 */

/**
 * @class UDPTransport
 */
export class UDPTransport extends Transport {

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

    /**
     * @type {UDPTransportOptions & {
     *  messageIncomingSequence: number,
     *  messageOutgoingSequence: number,
     *  shouldBeConnected: boolean,
     *  log: ReturnType<import('../log/index.js').Logger['withPrefix']>,
     *  socket: Socket | null,
     * }}
     */
    this.udpState = {
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
      'addDevice',
      'connect',
      'disconnect',
      'reconnect',
      'removeDevice',
      'writeToNetwork',
      '_connect',
      '_handleMessage',
      '_onConnection',
      '_onDisconnection'
    );

    setInterval(this._connect, Math.round(keepAlive / 2));
  }

  /**
   * manage sequence number to prepend to outgoing messages
   * @returns {number}
   */
  _getOutgoingSequence() {
    this.udpState.messageOutgoingSequence = this.udpState.messageOutgoingSequence === 0xff
      ? 0
      : (this.udpState.messageOutgoingSequence += 1);

    return this.udpState.messageOutgoingSequence;
  }

  /**
   * manage sequence number to check from incoming messages
   * @param {number} sequence sequence number
   * @returns {boolean} if message is valid
   */
  _checkIncomingSequence(sequence) {
    if (this.udpState.messageIncomingSequence === 0xff && sequence !== 0) return false;
    if (sequence < this.udpState.messageIncomingSequence) return false;

    this.udpState.messageIncomingSequence = sequence;

    return true;
  }

  /**
   * handle (dis)connection of socket
   */
  _connect() {
    const {
      log,
      shouldBeConnected
    } = this.udpState;

    const {
      isConnected
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
   * handle incoming messages
   * @param {Buffer} message message
   * @param {import('dgram').RemoteInfo} remoteInfo message rinfo
   */
  _handleMessage(message, remoteInfo) {
    const {
      log,
      sequenceHandling
    } = this.udpState;

    if (!remoteInfo.size) return;

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
   * destroy old socket and remove listeners
   */
  _nukeSocket() {
    const { socket } = this.udpState;
    if (!socket) return;

    socket.removeListener('message', this._handleMessage);
    socket.removeListener('listening', this._onConnection);
    socket.removeListener('close', this._onDisconnection);
    socket.removeListener('error', this._onDisconnection);

    socket.close();

    this.udpState.socket = null;
  }

  /**
   * handle socket connection
   */
  _onConnection() {
    const {
      log
    } = this.udpState;

    const {
      isConnected
    } = this.state;

    if (isConnected) return;

    log.info({
      head: 'is connected',
      value: true
    });

    this._setConnected(true);
  }

  /**
   * handle socket disconnection
   */
  _onDisconnection() {
    const {
      log
    } = this.udpState;

    const {
      isConnected
    } = this.state;

    if (!isConnected) return;

    this._nukeSocket();

    log.info({
      head: 'is connected',
      value: false
    });

    this._setConnected(false);
  }

  /**
   * create new socket and set up listeners
   */
  _setUpSocket() {
    const { host, port } = this.udpState;
    const socket = createSocket('udp4');

    socket.on('message', this._handleMessage);
    socket.on('listening', this._onConnection);
    socket.on('close', this._onDisconnection);
    socket.on('error', this._onDisconnection);

    this.udpState.socket = socket;

    socket.connect(port, host);
  }

  /**
   * connect UDPTransport instance
   */
  connect() {
    this.udpState.shouldBeConnected = true;

    this._connect();

    this.udpState.log.info({
      head: 'set connect',
      value: true
    });
  }

  /**
   * disconnect UDPTransport instance
   */
  disconnect() {
    this.udpState.shouldBeConnected = false;

    this._connect();

    this.udpState.log.info({
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
   * @param {unknown} _ device identifier buffer (not needed on UDPTransport)
   * @param {Buffer} payload payload buffer
   */
  writeToNetwork(_, payload) {
    const {
      host,
      log,
      port,
      sequenceHandling,
      socket
    } = this.udpState;

    const {
      isConnected
    } = this.state;

    if (!isConnected) {
      throw new Error('socket is not connected!');
    }

    log.debug(`send ${payload.length} byte payload`);

    log.debug({
      head: 'msg outgoing',
      attachment: humanPayload(payload)
    });

    if (sequenceHandling) {
      for (let index = 0; index < sequenceRepeatOutgoing; index += 1) {
        socket.send(
          Buffer.concat([
            Buffer.from([this._getOutgoingSequence()]),
            payload
          ]),
          port,
          host
        );
      }

      return;
    }

    socket.send(
      payload,
      port,
      host
    );
  }
}
