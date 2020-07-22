import { Transport, TransportOptions } from './index.js';
import { humanPayload, readNumber, writeNumber } from '../utils/data.js';
import { Input } from '../log/index.js';
import { Socket } from 'net';
import { Timer } from '../utils/time.js';
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

type TCPTransportState = {
  connectionTime: number;
  currentLength: number;
  host: string;
  keepAlive: number;
  lengthPreamble: number;
  log: Input;
  messageTimer: Timer;
  port: number;
  shouldBeConnected: boolean;
  socket: Socket | null;
};

export type TCPTransportOptions = TransportOptions & {
  host: TCPTransportState['host'];
  port: TCPTransportState['port'];
  lengthPreamble?: TCPTransportState['lengthPreamble'];
  keepAlive?: TCPTransportState['keepAlive'];
};

export class TCPTransport extends Transport {
  tcpState: TCPTransportState;

  constructor(options: TCPTransportOptions) {
    const { host, port, lengthPreamble = 1, keepAlive = 2000 } = options;

    if (!lengthPreamble) {
      throw new Error('insufficient options provided');
    }

    super(options);

    this.tcpState = {
      connectionTime: 0,
      currentLength: 0,
      shouldBeConnected: false,

      /* eslint-disable-next-line sort-keys */
      host,
      keepAlive,
      lengthPreamble,
      log: logger.getInput({
        head: 'TCPTransport',
      }),
      port,
      socket: null,

      /* eslint-disable-next-line sort-keys */
      messageTimer: new Timer(keepAlive * 2),
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
      '_handleReadable',
      '_onConnection',
      '_onDisconnection'
    );

    setInterval(this._connect, Math.round(keepAlive / 2));

    this.tcpState.messageTimer.on('hit', this._onDisconnection);
  }

  /**
   * handle (dis)connection of socket
   */
  _connect(): void {
    const { log, shouldBeConnected } = this.tcpState;

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
   * handle readable (incoming) bytes from socket
   */
  _handleReadable(): void {
    let remainder = true;
    while (remainder) {
      remainder = this._read();
    }
  }

  /**
   * destroy old socket and remove listeners
   */
  _nukeSocket(): void {
    const { socket } = this.tcpState;
    if (!socket) return;

    socket.removeListener('readable', this._handleReadable);
    socket.removeListener('connect', this._onConnection);
    socket.removeListener('end', this._onDisconnection);
    socket.removeListener('timeout', this._onDisconnection);
    socket.removeListener('error', this._onDisconnection);

    socket.end();
    socket.destroy();

    this.tcpState.socket = null;
  }

  /**
   * handle socket connection
   */
  _onConnection(): void {
    const { log } = this.tcpState;

    const { isConnected } = this.state;

    if (isConnected) return;

    this.tcpState.connectionTime = Date.now();

    log.info(() => 'is connected');

    this._setConnected(true);
  }

  /**
   * handle socket disconnection
   */
  _onDisconnection(): void {
    const { log, messageTimer } = this.tcpState;

    const { isConnected } = this.state;

    if (!isConnected) return;

    messageTimer.stop();

    this._nukeSocket();

    this.tcpState.currentLength = 0;

    log.info(() => 'is disconnected');

    this._setConnected(false);
  }

  /**
   * read the right amount of bytes from socket
   */
  _read(): boolean {
    const {
      currentLength,
      lengthPreamble,
      log,
      messageTimer,
      socket,
    } = this.tcpState;

    if (!socket) return false;

    if (currentLength) {
      const payload = socket.read(currentLength);
      if (!payload) return false;

      this.tcpState.currentLength = 0;

      messageTimer.stop();

      log.debug(() => `msg incoming\n\n${humanPayload(payload)}`);

      this._ingestIntoDeviceInstances(null, payload);

      return true;
    }

    const length = socket.read(lengthPreamble);
    if (!length) return false;

    this.tcpState.currentLength = readNumber(length, lengthPreamble);

    messageTimer.start();

    if (this.tcpState.currentLength > 5) {
      log.error(
        () => `unusual large message: ${this.tcpState.currentLength} bytes`
      );
    }

    log.debug(() => `receive ${this.tcpState.currentLength} byte payload`);

    return true;
  }

  /**
   * create new socket and set up listeners
   */
  _setUpSocket(): void {
    const { host, keepAlive, port } = this.tcpState;

    const socket = new Socket();
    socket.connect({ host, port });

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

    this.tcpState.socket = socket;
  }

  /**
   * connect TCPTransport instance
   */
  connect(): void {
    this.tcpState.shouldBeConnected = true;

    this._connect();

    this.tcpState.log.info(() => 'set connect');
  }

  /**
   * disconnect TCPTransport instance
   */
  disconnect(): void {
    this.tcpState.shouldBeConnected = false;

    this._connect();

    this.tcpState.log.info(() => 'set disconnect');
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
    const { lengthPreamble, socket, log } = this.tcpState;

    const { isConnected } = this.state;

    if (!socket) {
      throw new Error('no socket!');
    }

    if (!isConnected) {
      throw new Error('socket is not connected!');
    }

    log.debug(() => `send ${payload.length} byte payload`);

    log.debug(() => `msg outgoing\n\n${humanPayload(payload)}`);

    socket.write(
      Buffer.concat([writeNumber(payload.length, lengthPreamble), payload])
    );
  }
}
