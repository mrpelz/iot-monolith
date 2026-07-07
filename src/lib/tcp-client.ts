import { Socket } from 'node:net';
import {
  Duplex,
  Transform,
  TransformCallback,
  TransformOptions,
} from 'node:stream';

import { sleep } from '@mrpelz/misc-utils/sleep';
import { epochs } from '@mrpelz/modifiable-date';
import { Observable, ReadOnlyObservable } from '@mrpelz/observable';

type WriteQueueItem = {
  callback: (error?: Error | null) => void;
  chunk: Buffer;
  encoding: BufferEncoding;
};

export const DEFAULT_BACKOFF_MS = epochs.second;

export class TCPClient extends Duplex {
  private readonly _isConnected = new Observable<boolean>(false);
  private _isConnecting = false;
  private _isDisconnecting = false;
  private readonly _lastInteraction = new Observable<number>(0);
  private _reconnectionInterval?: NodeJS.Timeout;
  private _shouldBeConnected = false;
  private _socket?: Socket;
  private _writeQueue: WriteQueueItem[] = [];

  readonly isConnected = new ReadOnlyObservable(this._isConnected);
  readonly lastRx = new ReadOnlyObservable(this._lastInteraction);

  constructor(
    private readonly _host: string,
    private readonly _port: number,
    private readonly _reconnectionDelay: number = DEFAULT_BACKOFF_MS,
    private readonly _reconnectAfterInteractionSilence = 0,
  ) {
    super();
  }

  private _cleanupSocket(): void {
    this._socket?.removeAllListeners();
    this._socket?.resetAndDestroy();
    this._socket?.unref();
    this._socket = undefined;

    this._isDisconnecting = false;
    this._isConnected.value = false;

    this._lastInteraction.value = 0;
  }

  private async _connect(): Promise<void> {
    if (!this._shouldBeConnected) return;
    if (this._isConnected.value) return;

    if (this._isConnecting || this._isDisconnecting) return;
    this._isConnecting = true;

    const { promise, resolve } = Promise.withResolvers<void>();

    this._socket = new Socket({ keepAlive: true, noDelay: true });

    this._socket.on('connect', () => {
      this._isConnecting = false;
      this._isConnected.value = true;

      this._lastInteraction.value = Date.now();

      resolve();

      this._flushWriteQueue();
    });

    this._socket.on('data', (chunk: Buffer) => {
      this._lastInteraction.value = Date.now();

      const ok = this.push(chunk);
      if (!ok) this._socket?.pause();
    });

    this._socket.on('error', () => {
      this._isConnecting = false;

      resolve();
    });

    this._socket.once('close', () => {
      this._disconnect();
    });

    this._socket.connect(this._port, this._host);

    await promise;
  }

  private _disconnect(): void {
    if (!this._isConnected.value) return;

    if (this._isDisconnecting) return;
    this._isDisconnecting = true;

    this._cleanupSocket();
  }

  private _disconnectIfSilent() {
    if (!this._reconnectAfterInteractionSilence) return;
    if (!this._lastInteraction.value) return;
    if (
      Date.now() - this._lastInteraction.value <
      this._reconnectAfterInteractionSilence
    ) {
      return;
    }

    this._disconnect();
    this._connect();
  }

  private _flushWriteQueue(): void {
    const queue = this._writeQueue;
    this._writeQueue = [];
    for (const { chunk, encoding, callback } of queue) {
      this._write(chunk, encoding, callback);
    }
  }

  override _destroy(
    err: Error | null,
    callback: (error?: Error | null) => void,
  ): void {
    this._disconnect();

    callback(err);
  }

  override _final(callback: (error?: Error | null) => void): void {
    if (this._socket) this._socket.end(callback);
    // eslint-disable-next-line callback-return
    callback();

    this._disconnect();
  }

  override _read(): void {
    if (this._socket && this._socket.isPaused()) {
      this._socket.resume();
    }
  }

  override _write(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (this._socket && this._socket.writable) {
      this._socket.write(chunk, encoding, callback);
      this._lastInteraction.value = Date.now();
    } else {
      this._writeQueue.push({ callback, chunk, encoding });
    }
  }

  async connect(): Promise<void> {
    this._shouldBeConnected = true;

    clearInterval(this._reconnectionInterval);
    this._reconnectionInterval = setInterval(() => {
      this._connect();
      this._disconnectIfSilent();
    }, this._reconnectionDelay);

    await this._connect();
  }

  disconnect(): void {
    this._shouldBeConnected = false;

    clearInterval(this._reconnectionInterval);

    this._disconnect();
  }

  async reconnect(): Promise<void> {
    this.disconnect();
    await sleep(this._reconnectionDelay);

    await this.connect();
  }
}

export class DelimitedStream extends Transform {
  private _buffer = Buffer.alloc(0);

  constructor(
    private readonly _delimiter: Buffer,
    options?: TransformOptions,
  ) {
    super(options);
  }

  private _addToBuffer(chunk: Buffer) {
    this._buffer = Buffer.concat([this._buffer, chunk]);
  }

  _flush(done: TransformCallback): void {
    if (this._buffer.length > 0) {
      this.push(this._buffer);
      this._buffer = Buffer.alloc(0);
    }

    done();
  }

  _transform(chunk: Buffer, _encoding: string, done: TransformCallback): void {
    this._addToBuffer(chunk);

    let splitAt: number;
    while ((splitAt = this._buffer.indexOf(this._delimiter)) > -1) {
      this.push(this._buffer.subarray(0, splitAt));
      this._buffer = this._buffer.subarray(splitAt + this._delimiter.length);
    }

    done();
  }
}
