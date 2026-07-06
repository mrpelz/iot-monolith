import { Socket } from 'node:net';
import { Transform, TransformCallback, TransformOptions } from 'node:stream';

import { sleep } from '@mrpelz/misc-utils/sleep';
import { epochs } from '@mrpelz/modifiable-date';

export const DEFAULT_BACKOFF_MS = epochs.second;

export class TCPClient extends Socket {
  private _reconnectTimeout?: NodeJS.Timeout;
  private _rxSilenceTimeout?: NodeJS.Timeout;
  private _shouldConnect = false;

  constructor(
    private readonly _host: string,
    private readonly _port: number,
    private readonly _backoff = DEFAULT_BACKOFF_MS,
    private readonly _reconnectAfterRxSilence = _backoff * 100,
  ) {
    super();

    this.setNoDelay(true);
    this.setKeepAlive(true);

    this.on('connect', () => this._onConnect());

    this.on('data', () => this._onData());

    this.on('end', () => this._onEnd());
    this.on('error', () => this._onEnd());
  }

  private _onConnect() {
    clearTimeout(this._reconnectTimeout);
    this._onData();
  }

  private _onData() {
    if (!this._reconnectAfterRxSilence) return;

    clearTimeout(this._rxSilenceTimeout);

    this._rxSilenceTimeout = setTimeout(
      () => this.reconnect(),
      this._reconnectAfterRxSilence,
    );
  }

  private _onEnd() {
    clearTimeout(this._reconnectTimeout);
    if (!this._shouldConnect) return;

    this._reconnectTimeout = setTimeout(() => this.connect(), this._backoff);
  }

  connect(): this {
    this._shouldConnect = true;
    super.connect(this._port, this._host);

    return this;
  }

  disconnect(): void {
    this._shouldConnect = false;
    this.end();
  }

  async reconnect(): Promise<void> {
    this.disconnect();
    await sleep(this._backoff);

    this.connect();
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
