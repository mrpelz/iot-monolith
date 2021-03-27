import { RemoteInfo, Socket, createSocket } from 'dgram';
import { BooleanState } from '../state/index.js';
import { ReadOnlyObservable } from '../observable/index.js';
import { Transport } from './index.js';
import { humanPayload } from '../utils/data.js';
import { logger } from '../../app/logging.js';

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

export class UDPTransport extends Transport {
  private readonly _host: string;
  private readonly _keepAlive: number;
  private readonly _port: number;
  private readonly _sequenceHandling: boolean;
  private readonly _shouldBeConnected = new BooleanState(false);
  private readonly _udpLog = logger.getInput({ head: 'UDPTransport' });

  private _socket: Socket | null = null;
  private _messageOutgoingSequence = 0;
  private _messageIncomingSequence = 0;

  readonly shouldBeConnected: ReadOnlyObservable<boolean>;

  constructor(
    host: string,
    port: number,
    keepAlive = 2000,
    sequenceHandling = false
  ) {
    super();

    this._host = host;
    this._keepAlive = keepAlive;
    this._port = port;
    this._sequenceHandling = sequenceHandling;

    this.shouldBeConnected = new ReadOnlyObservable(this._shouldBeConnected);

    this._shouldBeConnected.observe(() => this._connect());

    setInterval(this._connect, Math.round(keepAlive / 2));
  }

  /**
   * handle (dis)connection of socket
   */
  private _connect() {
    this._udpLog.debug(() => 'connection/disconnection handling');

    if (this._shouldBeConnected.value && !this.isConnected.value) {
      this._nukeSocket();
      this._setUpSocket();
    } else if (!this._shouldBeConnected.value && this.isConnected.value) {
      this._nukeSocket();
    }
  }

  /**
   * manage sequence number to prepend to outgoing messages
   */
  _getOutgoingSequence(): number {
    this._messageOutgoingSequence =
      this._messageOutgoingSequence === 0xff
        ? 0
        : (this._messageOutgoingSequence += 1);

    return this._messageOutgoingSequence;
  }

  /**
   * manage sequence number to check from incoming messages
   */
  _checkIncomingSequence(sequence: number): boolean {
    if (this._messageIncomingSequence === 0xff && sequence !== 0) {
      return false;
    }

    if (sequence < this._messageIncomingSequence) {
      return false;
    }

    this._messageIncomingSequence = sequence;

    return true;
  }

  /**
   * handle incoming messages
   */
  _handleMessage(message: Buffer, remoteInfo: RemoteInfo): void {
    if (!remoteInfo.size) return;

    let payload: Buffer;

    if (this._sequenceHandling) {
      const sequence = message.subarray(0, 1);
      payload = message.subarray(1);

      if (!this._checkIncomingSequence(sequence.readUInt8(0))) return;
    } else {
      payload = message;
    }

    this._udpLog.debug(() => `msg incoming\n\n${humanPayload(payload)}`);

    this._ingestIntoDeviceInstances(null, payload);
  }

  /**
   * destroy old socket and remove listeners
   */
  _nukeSocket(): void {
    if (!this._socket) return;

    this._socket.removeListener('message', this._handleMessage);
    this._socket.removeListener('listening', this._onConnection);
    this._socket.removeListener('close', this._onDisconnection);
    this._socket.removeListener('error', this._onDisconnection);

    this._socket.close();

    this._socket = null;
  }

  /**
   * handle socket connection
   */
  _onConnection(): void {
    if (this.isConnected.value) return;

    this._udpLog.info(() => 'is connected');

    this._setConnected(true);
  }

  /**
   * handle socket disconnection
   */
  _onDisconnection(): void {
    if (!this.isConnected.value) return;

    this._nukeSocket();

    this._udpLog.info(() => 'is disconnected');

    this._setConnected(false);
  }

  /**
   * create new socket and set up listeners
   */
  _setUpSocket(): void {
    const socket = createSocket('udp4');

    socket.on('message', this._handleMessage);
    socket.on('listening', this._onConnection);
    socket.on('close', this._onDisconnection);
    socket.on('error', this._onDisconnection);

    this._socket = socket;

    socket.connect(this._port, this._host);
  }

  /**
   * connect UDPTransport instance
   */
  connect(): void {
    this._shouldBeConnected.value = true;

    this._udpLog.info(() => 'set connect');
  }

  /**
   * disconnect UDPTransport instance
   */
  disconnect(): void {
    this._shouldBeConnected.value = false;

    this._udpLog.info(() => 'set disconnect');
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
    if (!this._socket) {
      throw new Error('no socket!');
    }

    if (!this.isConnected.value) {
      throw new Error('socket is not connected!');
    }

    this._udpLog.debug(() => `send ${payload.length} byte payload`);
    this._udpLog.debug(() => `msg outgoing\n\n${humanPayload(payload)}`);

    if (this._sequenceHandling) {
      for (let index = 0; index < sequenceRepeatOutgoing; index += 1) {
        this._socket.send(
          Buffer.concat([Buffer.from([this._getOutgoingSequence()]), payload]),
          this._port,
          this._host
        );
      }

      return;
    }

    this._socket.send(payload, this._port, this._host);
  }
}
