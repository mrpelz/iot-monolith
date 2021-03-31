import { humanPayload, readNumber, writeNumber } from '../utils/data.js';
import { BooleanState } from '../state/index.js';
import { ReadOnlyObservable } from '../observable/index.js';
import { Socket } from 'net';
import { Timer } from '../timer/index.js';
import { Transport } from './index.js';
import { logger } from '../../app/logging.js';
import { rebind } from '../utils/oop.js';

// PACKET FORMAT
//
// request (to device):
// |                                |                      |                                    |                      |
// | length (1–n octets, default 1) | request id (1 octet) | service id (1–n octets, default 1) | payload (0–n octets) |
// |  packet length (incl. headers) |            0x01–0xFF |                          0x00–0xFF |                      |
// |                                |                      |                                    |                      |
//
// response (from device):
// |                                |                      |                      |
// | length (1–n octets, default 1) | request id (1 octet) | payload (0–n octets) |
// |  packet length (incl. headers) |            0x01–0xFF |                      |
// |                                |                      |                      |
//
// event (from device):
// |                                |                      |                                  |                      |
// | length (1–n octets, default 1) | request id (1 octet) | event id (1–n octets, default 1) | payload (0–n octets) |
// |  packet length (incl. headers) |          always 0x00 |                        0x00–0xFF |                      |
// |                                |                      |                                  |                      |
//

export class TCPTransport extends Transport {
  private _connectionTime: number;
  private _currentLength: number;
  private readonly _host: string;
  private readonly _keepAlive: number;
  private readonly _lengthPreamble: number;
  private readonly _messageTimer: Timer;
  private readonly _port: number;
  private readonly _shouldBeConnected = new BooleanState(false);
  private _socket: Socket | null = null;
  private readonly _tcpLog = logger.getInput({ head: 'TCPTransport' });

  readonly shouldBeConnected: ReadOnlyObservable<boolean>;

  constructor(
    host: string,
    port: number,
    lengthPreamble = 1,
    keepAlive = 2000
  ) {
    if (!lengthPreamble) {
      throw new Error('insufficient options provided');
    }

    super();

    rebind(
      this,
      '_connect',
      '_handleReadable',
      '_onConnection',
      '_onDisconnection'
    );

    this._host = host;
    this._keepAlive = keepAlive;
    this._lengthPreamble = lengthPreamble;
    this._messageTimer = new Timer(keepAlive * 2);
    this._port = port;

    this.shouldBeConnected = new ReadOnlyObservable(this._shouldBeConnected);

    this._shouldBeConnected.observe(() => this._connect());

    setInterval(this._connect, Math.round(keepAlive / 2));
    this._messageTimer.observe(this._onDisconnection);
  }

  /**
   * handle (dis)connection of socket
   */
  private _connect() {
    this._tcpLog.debug(() => 'connection/disconnection handling');

    if (this._shouldBeConnected.value && !this._isConnected.value) {
      this._nukeSocket();
      this._setUpSocket();
    } else if (!this._shouldBeConnected.value && this._isConnected.value) {
      this._nukeSocket();
    }
  }

  /**
   * handle readable (incoming) bytes from socket
   */
  private _handleReadable(): void {
    let remainder = true;
    while (remainder) {
      remainder = this._read();
    }
  }

  /**
   * destroy old socket and remove listeners
   */
  private _nukeSocket(): void {
    if (!this._socket) return;

    this._socket.removeListener('readable', this._handleReadable);
    this._socket.removeListener('connect', this._onConnection);
    this._socket.removeListener('end', this._onDisconnection);
    this._socket.removeListener('timeout', this._onDisconnection);
    this._socket.removeListener('error', this._onDisconnection);

    this._socket.end();
    this._socket.destroy();

    this._socket = null;
  }

  /**
   * handle socket connection
   */
  private _onConnection(): void {
    if (this._isConnected.value) return;

    this._connectionTime = Date.now();

    this._tcpLog.info(() => 'is connected');

    this._isConnected.value = true;
  }

  /**
   * handle socket disconnection
   */
  private _onDisconnection(): void {
    if (!this._isConnected.value) return;

    this._messageTimer.stop();

    this._nukeSocket();

    this._currentLength = 0;

    this._tcpLog.info(() => 'is disconnected');

    this._isConnected.value = false;
  }

  /**
   * read the right amount of bytes from socket
   */
  private _read(): boolean {
    if (!this._socket) return false;

    if (this._currentLength) {
      const payload = this._socket.read(this._currentLength);
      if (!payload) return false;

      this._currentLength = 0;

      this._messageTimer.stop();

      this._tcpLog.debug(() => `msg incoming\n\n${humanPayload(payload)}`);

      this._ingestIntoDeviceInstances(null, payload);

      return true;
    }

    const length = this._socket.read(this._lengthPreamble);
    if (!length) return false;

    this._currentLength = readNumber(length, this._lengthPreamble);

    this._messageTimer.start();

    if (this._currentLength > 5) {
      this._tcpLog.error(
        () => `unusual large message: ${this._currentLength} bytes`
      );
    }

    this._tcpLog.debug(() => `receive ${this._currentLength} byte payload`);

    return true;
  }

  /**
   * create new socket and set up listeners
   */
  private _setUpSocket(): void {
    const socket = new Socket();
    socket.connect({
      host: this._host,
      port: this._port,
    });

    socket.setNoDelay(true);

    if (this._keepAlive) {
      socket.setKeepAlive(true, this._keepAlive);
      socket.setTimeout(this._keepAlive * 2);
    }

    socket.on('readable', this._handleReadable);
    socket.on('connect', this._onConnection);
    socket.on('end', this._onDisconnection);
    socket.on('timeout', this._onDisconnection);
    socket.on('error', this._onDisconnection);

    this._socket = socket;
  }

  /**
   * connect TCPTransport instance
   */
  connect(): void {
    this._shouldBeConnected.value = true;

    this._tcpLog.info(() => 'set connect');
  }

  /**
   * disconnect TCPTransport instance
   */
  disconnect(): void {
    this._shouldBeConnected.value = false;

    this._tcpLog.info(() => 'set disconnect');
  }

  /**
   * reconnect TCPTransport instance
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

    if (!this._isConnected.value) {
      throw new Error('socket is not connected!');
    }

    this._tcpLog.debug(() => `send ${payload.length} byte payload`);

    this._tcpLog.debug(() => `msg outgoing\n\n${humanPayload(payload)}`);

    this._socket.write(
      Buffer.concat([
        writeNumber(payload.length, this._lengthPreamble),
        payload,
      ])
    );
  }
}
