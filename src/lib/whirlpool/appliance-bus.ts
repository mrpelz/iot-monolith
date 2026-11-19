/* eslint-disable no-bitwise */
/**
 * Framing layer of the appliance's internal serial bus (9600 8N1, inverted line),
 * as seen through the serial-to-TCP bridge. Device-independent: it knows frames,
 * not what they mean.
 *
 * Wire format of one frame:
 *
 *   ED | addr | ctl | payload (0..15 bytes) | CRC16 (big-endian)
 *
 *   addr  high nibble = source node, low nibble = destination node
 *   ctl   high nibble = frame type (see `FrameType`), low nibble = payload length
 *   CRC   CRC-16/CCITT-FALSE over addr, ctl and payload
 *
 * The controller precedes each of its frames with a line break, which a UART
 * reports as a single 0x00 byte. Replies from other nodes have no break.
 *
 * No delimiter is reliable here (0xED and 0x00 both occur inside frames), so
 * framing is done on the length nibble and the CRC.
 */

import {
  Observable,
  type Observer,
  ReadOnlyObservable,
} from '@mrpelz/observable';
import { NullState, ReadOnlyNullState } from '@mrpelz/observable/state';

import type { TCPClient } from '../tcp-client.js';

/** A message with the given enum fields replaced by their labels. */
export type Resolved<T, K extends keyof T> = Omit<T, K> & Record<K, string>;

/**
 * Looks a wire value up in a label map. Values the map does not know (the bus
 * can carry ones the enums do not list yet) come back as hex, e.g. `0x11`.
 */
export const resolveLabel = (
  labels: Readonly<Record<number, string>>,
  value: number,
): string => labels[value] ?? `0x${value.toString(16).padStart(2, '0')}`;

// ---------------------------------------------------------------- frames

/**
 * Types seen so far. Type 3 also occurs (on the dryer, between the controller
 * and a third node) but is not understood; it passes through as a plain number.
 */
export enum FrameType {
  /** Polls and "nothing to send" replies. */
  EMPTY = 0x0,
  /** Periodic records sent by the controller to all nodes (destination 0xf). */
  BROADCAST = 0x1,
  /** Application messages. */
  DATA = 0x4,
}

export type Frame = {
  /** Node address, 0x0..0xf. */
  destination: number;
  payload: Buffer;
  /** The complete frame, from ED to the last CRC byte. */
  raw: Buffer;
  /** Node address, 0x0..0xf. */
  source: number;
  type: FrameType;
};

export enum ParseEventKind {
  FRAME = 'FRAME',
  /** Bytes that did not form a valid frame. */
  GARBAGE = 'GARBAGE',
}

export type ParseEvent =
  | {
      frame: Frame;
      kind: ParseEventKind.FRAME;
    }
  | {
      bytes: Buffer;
      kind: ParseEventKind.GARBAGE;
    };

const START_BYTE = 0xed;
const BREAK_BYTE = 0x00;
const HEADER_LENGTH = 3;
const CRC_LENGTH = 2;
const MAX_PAYLOAD_LENGTH = 0x0f;

const CRC_TABLE: readonly number[] = Array.from({ length: 256 }, (_, index) => {
  let crc = index << 8;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
  }
  return crc;
});

/** CRC-16/CCITT-FALSE. A frame is valid when the CRC over addr..CRC is zero. */
export const crc16 = (data: Uint8Array, initial = 0xffff): number => {
  let crc = initial;
  for (const byte of data) {
    crc = ((crc << 8) & 0xffff) ^ (CRC_TABLE[(crc >> 8) ^ byte] ?? 0);
  }
  return crc;
};

/** Builds a complete frame. Does not add the leading break. */
export const encodeFrame = (
  source: number,
  destination: number,
  payload: Uint8Array = Buffer.alloc(0),
): Buffer => {
  if (payload.length > MAX_PAYLOAD_LENGTH) {
    throw new RangeError(`payload too long: ${payload.length} bytes`);
  }

  const type = payload.length > 0 ? FrameType.DATA : FrameType.EMPTY;
  const body = Buffer.from([
    ((source & 0x0f) << 4) | (destination & 0x0f),
    (type << 4) | payload.length,
    ...payload,
  ]);
  const crc = crc16(body);

  return Buffer.from([START_BYTE, ...body, crc >> 8, crc & 0xff]);
};

const toFrame = (raw: Buffer): Frame => ({
  destination: (raw[1] ?? 0) & 0x0f,
  payload: raw.subarray(HEADER_LENGTH, raw.length - CRC_LENGTH),
  raw,
  source: (raw[1] ?? 0) >> 4,
  type: (raw[2] ?? 0) >> 4,
});

/**
 * Turns bus bytes into frames. Feed it chunks of any size; it keeps an
 * incomplete frame (at most 19 bytes) until the rest arrives.
 */
export class FrameParser {
  private _pending: Buffer = Buffer.alloc(0);

  push(chunk: Buffer): ParseEvent[] {
    const data =
      this._pending.length > 0 ? Buffer.concat([this._pending, chunk]) : chunk;
    const events: ParseEvent[] = [];

    let garbageStart = -1;
    let position = 0;

    const flushGarbage = (end: number) => {
      if (garbageStart < 0) return;

      events.push({
        bytes: Buffer.from(data.subarray(garbageStart, end)),
        kind: ParseEventKind.GARBAGE,
      });
      garbageStart = -1;
    };

    while (position < data.length) {
      const byte = data[position];

      if (byte === START_BYTE) {
        const available = data.length - position;
        if (available < HEADER_LENGTH) break;

        const length =
          HEADER_LENGTH +
          ((data[position + 2] ?? 0) & MAX_PAYLOAD_LENGTH) +
          CRC_LENGTH;
        if (available < length) break;

        const raw = data.subarray(position, position + length);
        if (crc16(raw.subarray(1)) === 0) {
          flushGarbage(position);
          events.push({
            frame: toFrame(Buffer.from(raw)),
            kind: ParseEventKind.FRAME,
          });
          position += length;

          continue;
        }
      } else if (byte === BREAK_BYTE && garbageStart < 0) {
        // break marker between frames
        position += 1;

        continue;
      }

      if (garbageStart < 0) garbageStart = position;
      position += 1;
    }

    flushGarbage(position);
    this._pending = Buffer.from(data.subarray(position));

    return events;
  }

  /** Drops any incomplete frame, e.g. after a reconnect. */
  reset(): void {
    this._pending = Buffer.alloc(0);
  }
}

// ---------------------------------------------------------------- bus

export type ApplianceBusCounters = {
  frames: number;
  garbageBytes: number;
};

/** The controller polls every ~25 ms while the appliance is switched on. */
export const DEFAULT_SILENCE_MS = 1000;

/**
 * One appliance bus behind one `TCPClient`. Parses the byte stream into frames
 * and tracks whether the bus is alive. Device classes build on this.
 */
export class ApplianceBus {
  private readonly _connectionObserver: Observer;
  private readonly _counters: ApplianceBusCounters = {
    frames: 0,
    garbageBytes: 0,
  };

  private readonly _frame = new NullState<Frame>();
  private readonly _garbage = new NullState<Buffer>();
  private readonly _isActive = new Observable<boolean>(false);
  private readonly _parser = new FrameParser();
  private _silenceTimeout: NodeJS.Timeout | undefined;

  /** Every valid frame, including the empty polls and replies (about 40 per second). */
  readonly frame = new ReadOnlyNullState(this._frame);

  /** Bytes that could not be framed. */
  readonly garbage = new ReadOnlyNullState(this._garbage);

  /**
   * True while valid frames keep arriving. The bus is silent when the
   * appliance is switched off, so this doubles as "appliance is on".
   */
  readonly isActive = new ReadOnlyObservable(this._isActive);

  constructor(
    private readonly _client: TCPClient,
    private readonly _silenceMs: number = DEFAULT_SILENCE_MS,
  ) {
    this._client.on('data', this._handleData);

    this._connectionObserver = this._client.isConnected.observe(
      (isConnected) => {
        // a partial frame from before the connection change can never be completed
        this._parser.reset();

        if (!isConnected) this._setInactive();
      },
    );
  }

  private readonly _handleData = (chunk: Buffer): void => {
    for (const event of this._parser.push(chunk)) {
      if (event.kind === ParseEventKind.GARBAGE) {
        this._counters.garbageBytes += event.bytes.length;
        this._garbage.trigger(event.bytes);

        continue;
      }

      this._counters.frames += 1;
      this._setActive();
      this._frame.trigger(event.frame);
    }
  };

  private _setActive(): void {
    clearTimeout(this._silenceTimeout);
    this._silenceTimeout = setTimeout(
      () => this._setInactive(),
      this._silenceMs,
    );
    this._silenceTimeout.unref();

    this._isActive.set(true);
  }

  private _setInactive(): void {
    clearTimeout(this._silenceTimeout);
    this._silenceTimeout = undefined;

    this._isActive.set(false);
  }

  get counters(): Readonly<ApplianceBusCounters> {
    return this._counters;
  }

  /** Stops listening to the client. The client itself is left untouched. */
  dispose(): void {
    this._client.off('data', this._handleData);
    this._connectionObserver.remove();
    this._setInactive();
  }
}
