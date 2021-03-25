import { RemoteInfo, Socket, createSocket } from 'dgram';
import { Transport, TransportOptions } from './index.js';
import { BooleanState } from '../state/index.js';
import { Input } from '../log/index.js';
import { humanPayload } from '../utils/data.js';
import { logger } from '../../app/logging.js';
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

const sequenceRepeatOutgoing = 5;

type UDPTransportState = {
  host: string;
  keepAlive: number;
  log: Input;
  messageIncomingSequence: number;
  messageOutgoingSequence: number;
  port: number;
  sequenceHandling: boolean;
  shouldBeConnected: BooleanState;
  socket: Socket | null;
};

export type UDPTransportOptions = TransportOptions & {
  host: UDPTransportState['host'];
  port: UDPTransportState['port'];
  keepAlive?: UDPTransportState['keepAlive'];
  sequenceHandling?: UDPTransportState['sequenceHandling'];
};

export class UDPTransport extends Transport {
  udpState: UDPTransportState;

  constructor(options: UDPTransportOptions) {
    const { host, port, keepAlive = 2000, sequenceHandling = false } = options;

    super(options);

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

    this.udpState = {
      messageIncomingSequence: 0,
      messageOutgoingSequence: 0,
      shouldBeConnected: new BooleanState(false),

      /* eslint-disable-next-line sort-keys */
      host,
      keepAlive,
      log: logger.getInput({
        head: 'UDPTransport',
      }),
      port,
      sequenceHandling,
      socket: null,
    };

    this.udpState.shouldBeConnected.observe(() => this._connect());

    setInterval(this._connect, Math.round(keepAlive / 2));
  }

  /**
   * manage sequence number to prepend to outgoing messages
   */
  _getOutgoingSequence(): number {
    this.udpState.messageOutgoingSequence =
      this.udpState.messageOutgoingSequence === 0xff
        ? 0
        : (this.udpState.messageOutgoingSequence += 1);

    return this.udpState.messageOutgoingSequence;
  }

  /**
   * manage sequence number to check from incoming messages
   */
  _checkIncomingSequence(sequence: number): boolean {
    if (this.udpState.messageIncomingSequence === 0xff && sequence !== 0) {
      return false;
    }

    if (sequence < this.udpState.messageIncomingSequence) {
      return false;
    }

    this.udpState.messageIncomingSequence = sequence;

    return true;
  }

  /**
   * handle (dis)connection of socket
   */
  _connect(): void {
    const { log, shouldBeConnected } = this.udpState;

    const { isConnected } = this.state;

    log.debug(() => 'connection/disconnection handling');

    if (shouldBeConnected && !isConnected) {
      this._nukeSocket();
      this._setUpSocket();
    } else if (!shouldBeConnected && isConnected) {
      this._nukeSocket();
    }
  }

  /**
   * handle incoming messages
   */
  _handleMessage(message: Buffer, remoteInfo: RemoteInfo): void {
    const { log, sequenceHandling } = this.udpState;

    if (!remoteInfo.size) return;

    let payload: Buffer;

    if (sequenceHandling) {
      const sequence = message.subarray(0, 1);
      payload = message.subarray(1);

      if (!this._checkIncomingSequence(sequence.readUInt8(0))) return;
    } else {
      payload = message;
    }

    log.debug(() => `msg incoming\n\n${humanPayload(payload)}`);

    this._ingestIntoDeviceInstances(null, payload);
  }

  /**
   * destroy old socket and remove listeners
   */
  _nukeSocket(): void {
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
  _onConnection(): void {
    const { log } = this.udpState;

    const { isConnected } = this.state;

    if (isConnected) return;

    log.info(() => 'is connected');

    this._setConnected(true);
  }

  /**
   * handle socket disconnection
   */
  _onDisconnection(): void {
    const { log } = this.udpState;

    const { isConnected } = this.state;

    if (!isConnected) return;

    this._nukeSocket();

    log.info(() => 'is disconnected');

    this._setConnected(false);
  }

  /**
   * create new socket and set up listeners
   */
  _setUpSocket(): void {
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
  connect(): void {
    this.udpState.shouldBeConnected.value = true;

    this.udpState.log.info(() => 'set connect');
  }

  /**
   * disconnect UDPTransport instance
   */
  disconnect(): void {
    this.udpState.shouldBeConnected.value = false;

    this.udpState.log.info(() => 'set disconnect');
  }

  /**
   * reconnect UDPTransport instance
   */
  reconnect(): void {
    this._onDisconnection();
  }

  /**
   * write from Transport instance to network
   */
  writeToNetwork(_: unknown, payload: Buffer): void {
    const { host, log, port, sequenceHandling, socket } = this.udpState;

    const { isConnected } = this.state;

    if (!socket) {
      throw new Error('no socket!');
    }

    if (!isConnected) {
      throw new Error('socket is not connected!');
    }

    log.debug(() => `send ${payload.length} byte payload`);

    log.debug(() => `msg outgoing\n\n${humanPayload(payload)}`);

    if (sequenceHandling) {
      for (let index = 0; index < sequenceRepeatOutgoing; index += 1) {
        socket.send(
          Buffer.concat([Buffer.from([this._getOutgoingSequence()]), payload]),
          port,
          host
        );
      }

      return;
    }

    socket.send(payload, port, host);
  }
}
