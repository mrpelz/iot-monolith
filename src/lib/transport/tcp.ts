import { Input, Logger } from '../log.js';
import { humanPayload, readNumber, writeNumber } from '../data.js';
import { BooleanState } from '../state.js';
import { ReadOnlyObservable } from '../observable.js';
import { Socket } from 'net';
import { Timer } from '../timer.js';
import { Transport } from './main.js';
import { promises } from 'dns';
import { rebind } from '../oop.js';

const { lookup } = promises;

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
  private readonly _log: Input;
  private readonly _messageTimer: Timer;
  private readonly _port: number;
  private readonly _shouldBeConnected = new BooleanState(false);
  private _socket: Socket | null = null;

  readonly shouldBeConnected: ReadOnlyObservable<boolean>;

  constructor(
    host: string,
    port: number,
    logger: Logger,
    lengthPreamble = 1,
    keepAlive = 2000
  ) {
    if (!lengthPreamble) {
      throw new Error('insufficient options provided');
    }

    super(logger, `${host}:${port}`);

    this._log = logger.getInput({
      head: `TCPTransport "${this.friendlyName}"`,
    });

    rebind(this, '_handleReadable', '_onConnection', '_onDisconnection');

    this._host = host;
    this._keepAlive = keepAlive;
    this._lengthPreamble = lengthPreamble;
    this._messageTimer = new Timer(keepAlive * 2);
    this._port = port;

    this.shouldBeConnected = new ReadOnlyObservable(this._shouldBeConnected);

    this._shouldBeConnected.observe(() => this._connect());

    setInterval(() => this._connect(), Math.round(keepAlive / 2));
    this._messageTimer.observe(this._onDisconnection);
  }

  /**
   * handle (dis)connection of socket
   */
  private _connect() {
    this._log.debug(() => 'connection/disconnection handling');

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

    this._log.info(() => 'is connected');

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

    this._log.info(() => 'is disconnected');

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

      this._log.debug(() => `msg incoming\n\n${humanPayload(payload)}`);

      this._ingestIntoDeviceInstances(null, payload);

      return true;
    }

    const length = this._socket.read(this._lengthPreamble);
    if (!length) return false;

    this._currentLength = readNumber(length, this._lengthPreamble);

    this._messageTimer.start();

    if (this._currentLength > 5) {
      this._log.error(
        () => `unusual large message: ${this._currentLength} bytes`
      );
    }

    this._log.debug(() => `receive ${this._currentLength} byte payload`);

    return true;
  }

  /**
   * create new socket and set up listeners
   */
  private _setUpSocket(): void {
    const socket = new Socket();

    socket.on('readable', this._handleReadable);
    socket.on('connect', this._onConnection);
    socket.on('end', this._onDisconnection);
    socket.on('timeout', this._onDisconnection);
    socket.on('error', this._onDisconnection);

    this._socket = socket;

    (async () => {
      const { address } = await lookup(this._host, 4);

      socket.connect({
        host: address,
        port: this._port,
      });

      socket.setNoDelay(true);

      if (this._keepAlive) {
        socket.setKeepAlive(true, this._keepAlive);
        socket.setTimeout(this._keepAlive * 2);
      }
    })().catch((error) => {
      this._log.error(() => `error connecting socket: ${error}`);
      this._nukeSocket();
    });
  }

  /**
   * connect TCPTransport instance
   */
  connect(): void {
    this._shouldBeConnected.value = true;

    this._log.info(() => 'set connect');
  }

  /**
   * disconnect TCPTransport instance
   */
  disconnect(): void {
    this._shouldBeConnected.value = false;

    this._log.info(() => 'set disconnect');
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
      this._log.error(() => 'socket is not connected!');
    }

    this._log.debug(() => `send ${payload.length} byte payload`);

    this._log.debug(() => `msg outgoing\n\n${humanPayload(payload)}`);

    this._socket.write(
      Buffer.concat([
        writeNumber(payload.length, this._lengthPreamble),
        payload,
      ])
    );
  }
}
