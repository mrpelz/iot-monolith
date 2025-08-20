import { createSocket, RemoteInfo, Socket } from 'node:dgram';
import { promises } from 'node:dns';

import {
  humanPayload,
  NUMBER_RANGES,
  rebind,
  RollingNumber,
} from '@mrpelz/misc-utils';
import { BooleanState, ReadOnlyObservable } from '@mrpelz/observable';
import { MappedStruct, UInt8 } from '@mrpelz/struct';

import { callstack, Input, Logger } from '../log.js';
import { Transport } from './main.js';

const { lookup } = promises;

// PACKET FORMAT
//
// request, without sequence number (default, to device):
// |                      |                                    |                            |                      |
// | request id (1 octet) | service id (1–n octets, default 1) | service index (1–n octets) | payload (0–n octets) |
// |            0x01–0xFF |                          0x00–0xFF |                  0x00–0xFF |                      |
// |                      |                                    |                            |                      |
//
// response, without sequence number (default, from device):
// |                      |                      |
// | request id (1 octet) | payload (0–n octets) |
// |            0x01–0xFF |                      |
// |                      |                      |
//
// event, without sequence number (default, from device):
// |                      |                                  |                          |                      |
// | request id (1 octet) | event id (1–n octets, default 1) | event index (1–n octets) | payload (0–n octets) |
// |          always 0x00 |                        0x00–0xFF |                0x00–0xFF |                      |
// |                      |                                  |                          |                      |
//
// request, with sequence number (to device):
// |                           |                      |                                    |                            |                      |
// | sequence number (1 octet) | request id (1 octet) | service id (1–n octets, default 1) | service index (1–n octets) | payload (0–n octets) |
// |                 0x00–0xFF |            0x01–0xFF |                          0x00–0xFF |                  0x00–0xFF |                      |
// |                           |                      |                                    |                            |                      |
//
// response, with sequence number (from device):
// |                           |                      |                      |
// | sequence number (1 octet) | request id (1 octet) | payload (0–n octets) |
// |                 0x00–0xFF |            0x01–0xFF |                      |
// |                           |                      |                      |
//
// event, with sequence number (from device):
// |                           |                      |                                  |                          |                      |
// | sequence number (1 octet) | request id (1 octet) | event id (1–n octets, default 1) | event index (1–n octets) | payload (0–n octets) |
// |                 0x00–0xFF |          always 0x00 |                        0x00–0xFF |                0x00–0xFF |                      |
// |                           |                      |                                  |                          |                      |
//

const REPEAT = 2;
const REPEAT_PADDING_MS = 10;

const sequenceHeaderIncoming = new MappedStruct({
  sequence: new UInt8(),
});

export class UDPTransport extends Transport {
  private readonly _keepAlive: number;
  private readonly _log: Input;
  private _messageIncomingSequence = 0;

  private readonly _messageOutgoingSequence = new RollingNumber(
    ...NUMBER_RANGES.uint[1],
  );

  private readonly _repeat: number;
  private readonly _sequenceHandling: boolean;
  private readonly _shouldBeConnected = new BooleanState(false);
  private _socket: Socket | null = null;

  readonly host: string;
  readonly port: number;
  readonly shouldBeConnected: ReadOnlyObservable<boolean>;

  constructor(
    host: string,
    port: number,
    logger: Logger,
    keepAlive = 2000,
    sequenceHandling = false,
    repeat = REPEAT,
  ) {
    super(logger);

    this.host = host;
    this._keepAlive = keepAlive;
    this.port = port;
    this._repeat = repeat;
    this._sequenceHandling = sequenceHandling;

    this._log = logger.getInput({
      head: `${this.constructor.name} "${this.host}:${this.port}"`,
    });

    rebind(this, '_handleMessage', '_onConnection', '_onDisconnection');

    this.shouldBeConnected = new ReadOnlyObservable(this._shouldBeConnected);

    this._shouldBeConnected.observe(() => this._connect());

    setInterval(() => this._connect(), Math.round(keepAlive / 2));
  }

  /**
   * manage sequence number to check from incoming messages
   */
  private _checkIncomingSequence(sequence: number) {
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
   * handle (dis)connection of socket
   */
  private _connect() {
    if (this._shouldBeConnected.value && !this._isConnected.value) {
      this._onDisconnection();
      this._setUpSocket();
    } else if (!this._shouldBeConnected.value && this._isConnected.value) {
      this._onDisconnection();
    }
  }

  /**
   * handle incoming messages
   */
  private _handleMessage(input: Buffer, remoteInfo: RemoteInfo) {
    if (remoteInfo.size === 0) return;

    let messagePayload: Buffer;

    if (this._sequenceHandling) {
      const [{ sequence }, _messagePayload] =
        sequenceHeaderIncoming.decodeOpenended(input);
      messagePayload = _messagePayload;

      if (!this._checkIncomingSequence(sequence)) return;
    } else {
      messagePayload = input;
    }

    this._log.debug(() => `msg incoming\n\n${humanPayload(messagePayload)}`);

    this._ingestIntoDeviceInstances(null, messagePayload);
  }

  /**
   * destroy old socket and remove listeners
   */
  private _nukeSocket() {
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
  private _onConnection() {
    if (this._isConnected.value) return;

    this._log.info(() => 'is connected');

    this._isConnected.value = true;
  }

  /**
   * handle socket disconnection
   */
  private _onDisconnection() {
    if (!this._isConnected.value) return;

    this._nukeSocket();

    this._log.info(() => 'is disconnected');

    this._isConnected.value = false;
  }

  /**
   * create new socket and set up listeners
   */
  private async _setUpSocket() {
    const address = await (async () => {
      try {
        const { address: result } = await lookup(this.host, 4);
        return result;
      } catch (_error) {
        const error = new Error('cannot resolve hostname', { cause: _error });

        this._log.error(() => error.message, callstack(error));

        return null;
      }
    })();

    if (!address) return;

    const socket = createSocket('udp4');

    socket.on('message', this._handleMessage);
    socket.on('listening', this._onConnection);
    socket.on('close', this._onDisconnection);
    socket.on('error', this._onDisconnection);

    this._socket = socket;

    (async () => {
      socket.connect(this.port, address);
    })().catch((error) => {
      this._log.error(
        () =>
          `error connecting socket (hostname "${this.host}", address: ${address}): ${error.message}`,
        callstack(error),
      );
      this._nukeSocket();
    });
  }

  /**
   * connect UDPTransport instance
   */
  connect(): void {
    this._shouldBeConnected.value = true;

    this._log.info(() => 'set connect');
  }

  /**
   * disconnect UDPTransport instance
   */
  disconnect(): void {
    this._shouldBeConnected.value = false;

    this._log.info(() => 'set disconnect');
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

    if (!this._isConnected.value) {
      this._log.error(() => 'socket is not connected!', callstack());
    }

    this._log.debug(() => `send ${payload.length} byte payload`);
    this._log.debug(() => `msg outgoing\n\n${humanPayload(payload)}`);

    for (let index = 0; index < this._repeat; index += 1) {
      const data = this._sequenceHandling
        ? Buffer.concat([
            Buffer.from([this._messageOutgoingSequence.get()]),
            payload,
          ])
        : payload;

      // eslint-disable-next-line unicorn/consistent-function-scoping
      const send = () => this._socket?.send(data, this.port, this.host);

      if (index) {
        setTimeout(send, REPEAT_PADDING_MS * index);
      } else {
        send();
      }
    }
  }
}
