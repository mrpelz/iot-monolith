/* eslint-disable no-bitwise */
/**
 * Washing machine on an `ApplianceBus`: message decoding and live state.
 *
 * Node 2 is the main controller (bus master), node 3 the control panel.
 * Everything marked "tentative" is inferred from few observations.
 */

import { Observable, Observer, ReadOnlyObservable } from '@mrpelz/observable';
import { NullState, ReadOnlyNullState } from '@mrpelz/observable/state';

import type { TCPClient } from '../tcp-client.js';
import { ApplianceBus, type Frame, FrameType } from './appliance-bus.js';

// ---------------------------------------------------------------- enums

export enum BusNode {
  CONTROLLER = 0x2,
  PANEL = 0x3,
  /** Destination of the panel's empty "nothing to send" reply. */
  NONE = 0xf,
}

export enum MessageKind {
  ACK = 'ACK',
  ACTIVITY = 'ACTIVITY',
  ESTIMATE = 'ESTIMATE',
  KEY = 'KEY',
  MAX_LOAD = 'MAX_LOAD',
  POWER_OFF = 'POWER_OFF',
  SELECTION = 'SELECTION',
  STATUS = 'STATUS',
  STATUS_REQUEST = 'STATUS_REQUEST',
  UNKNOWN = 'UNKNOWN',
}

export enum AckStatus {
  OK = 0x00,
  /** Tentative: seen only for commands 0x13 and 0x1b. */
  REJECTED = 0x05,
}

export enum Program {
  ECO_COTTON = 0x00,
  COTTON = 0x01,
  MIXED = 0x02,
  SYNTHETICS = 0x03,
  DELICATES = 0x04,
  WOOL = 0x05,
  COLORS = 0x06,
  RAPID_30 = 0x07,
  RINSE_AND_SPIN = 0x08,
  SPIN = 0x09,
  DRAIN = 0x0a,
  SHIRTS = 0x0b,
  DUVET = 0x0c,
  BED_LINEN = 0x0d,
  CASHMERE = 0x0e,
  SPORT = 0x0f,
  JEANS = 0x10,
  BABY = 0x11,
  MINI_LOAD = 0x12,
}

export enum TemperatureSetting {
  /** Sent as 20 °C on the bus. */
  C20 = 0,
  C30 = 1,
  C40 = 2,
  C50 = 3,
  C60 = 4,
  C95 = 5,
}

/** Panel labels; the rpm sent on the bus is about 96 % of these. */
export enum SpinSetting {
  NO_SPIN = 0,
  RPM_400 = 1,
  RPM_800 = 2,
  RPM_1000 = 3,
  RPM_1200 = 4,
  RPM_1400 = 5,
}

export enum WashOption {
  BIO_STAIN_15 = 'BIO_STAIN_15',
  COLORS_15 = 'COLORS_15',
  DOSING_AID = 'DOSING_AID',
  FRESH_FINISH = 'FRESH_FINISH',
  HEAVY_SOIL = 'HEAVY_SOIL',
  HOT_FINISH = 'HOT_FINISH',
  INTENSIVE_RINSE = 'INTENSIVE_RINSE',
  PREWASH = 'PREWASH',
  RAPID = 'RAPID',
  RINSE_HOLD = 'RINSE_HOLD',
}

export enum PanelKey {
  START = 0x01,
  PAUSE = 0x02,
  ABORT = 0x03,
  POWER_OFF = 0x06,
}

/** Which controller command carried a status record. */
export enum StatusSource {
  /** Unsolicited update (0x09). */
  UPDATE = 0x09,
  /** Answer to a selection change (0x0b). */
  SELECTION_REPLY = 0x0b,
  /** Answer to a status request from the panel (0x29). */
  REQUEST_REPLY = 0x29,
}

export enum CycleStage {
  IDLE = 0x00,
  ABORTING = 0x01,
  PRE_PHASE = 0x03,
  MAIN_WASH = 0x04,
  FIRST_RINSE = 0x05,
  LAST_RINSE = 0x0a,
  FINAL_SPIN = 0x0c,
  END = 0x0d,
  FRESH_FINISH = 0x0e,
}

export enum RunMode {
  SELECTING = 0x01,
  STARTED = 0x02,
  PAUSED = 0x06,
}

export enum Activity {
  DRAIN = 0x01,
  /** Tentative: first 20 s after start, during load sensing. */
  START_SENSE = 0x02,
  FILL = 0x03,
  /** Display shows "Waschen". */
  TUMBLE = 0x04,
  SPIN = 0x05,
  /** Display shows "Waschen" in the pre-phase and "Spülen" in the rinse stages. */
  AGITATE = 0x06,
}

// ---------------------------------------------------------------- messages

type MessageBase = {
  frame: Frame;
};

export type AckMessage = MessageBase & {
  /** Command byte of the message being acknowledged. */
  command: number;
  kind: MessageKind.ACK;
  status: AckStatus;
};

export type SelectionMessage = MessageBase & {
  kind: MessageKind.SELECTION;
  /** The three option bytes as sent, for bits not decoded yet. */
  optionBytes: Buffer;
  options: WashOption[];
  program: Program;
  /** True while the special-programme menu is open and not yet confirmed. */
  specialMenuOpen: boolean;
  spin: SpinSetting;
  spinRpm: number;
  temperature: TemperatureSetting;
  temperatureCelsius: number;
};

export type KeyMessage = MessageBase & {
  key: PanelKey;
  kind: MessageKind.KEY;
};

export type StatusRequestMessage = MessageBase & {
  kind: MessageKind.STATUS_REQUEST;
};

export type StatusMessage = MessageBase & {
  /** True while the display shows "Anpassen" and the remaining time is being recalculated. */
  adjusting: boolean;
  /** Undecoded adjusting byte (0x81 and 0x82 seen). */
  adjustingRaw: number;
  doorLocked: boolean;
  doorOpen: boolean;
  /** Undecoded flags byte. */
  flags: number;
  kind: MessageKind.STATUS;
  mode: RunMode;
  remainingMinutes: number;
  source: StatusSource;
  spin: SpinSetting;
  stage: CycleStage;
  temperature: TemperatureSetting;
  temperatureCelsius: number;
  /** The four undecoded trailing bytes. */
  trailer: Buffer;
};

export type ActivityMessage = MessageBase & {
  activity: Activity;
  kind: MessageKind.ACTIVITY;
  /** Step number within the programme; counts up as the cycle proceeds. */
  step: number;
};

export type MaxLoadMessage = MessageBase & {
  kilograms: number;
  kind: MessageKind.MAX_LOAD;
};

export type EstimateMessage = MessageBase & {
  /** Tentative: probably Wh. */
  energy: number;
  kind: MessageKind.ESTIMATE;
  waterLitres: number;
};

export type PowerOffMessage = MessageBase & {
  kind: MessageKind.POWER_OFF;
};

export type UnknownMessage = MessageBase & {
  kind: MessageKind.UNKNOWN;
};

export type Message =
  | AckMessage
  | ActivityMessage
  | EstimateMessage
  | KeyMessage
  | MaxLoadMessage
  | PowerOffMessage
  | SelectionMessage
  | StatusMessage
  | StatusRequestMessage
  | UnknownMessage;

// ---------------------------------------------------------------- decoding

/** First payload byte of every application message seen so far. */
const SERVICE = 0x23;
const ACK_HEADER = [0x01, 0x21] as const;

enum Command {
  KEY_START = 0x01,
  KEY_PAUSE = 0x02,
  KEY_ABORT = 0x03,
  SELECTION = 0x04,
  POWER_OFF = 0x06,
  DISPLAY = 0x08,
  STATUS = 0x09,
  SELECTION_REPLY = 0x0b,
  ESTIMATE = 0x13,
  STATUS_REPLY = 0x29,
}

enum DisplayItem {
  ACTIVITY = 0x06,
  MAX_LOAD = 0x0e,
}

const SELECTION_OPTION_BITS: readonly (readonly [
  byteIndex: number,
  mask: number,
  option: WashOption,
])[] = [
  [0, 0x01, WashOption.PREWASH],
  [0, 0x02, WashOption.BIO_STAIN_15],
  [0, 0x04, WashOption.HEAVY_SOIL],
  [0, 0x80, WashOption.INTENSIVE_RINSE],
  [1, 0x04, WashOption.HOT_FINISH],
  [1, 0x08, WashOption.RINSE_HOLD],
  [1, 0x10, WashOption.COLORS_15],
  [1, 0x80, WashOption.DOSING_AID],
  [2, 0x08, WashOption.FRESH_FINISH],
];

const SELECTION_MODE_MASK = 0x03;
const SELECTION_MODE_RAPID = 0x01;
const SELECTION_SPECIAL_MENU = 0x20;
const STATUS_FLAG_DOOR_LOCKED = 0x80;
const STATUS_FLAG_DOOR_OPEN = 0x02;

const byteAt = (buffer: Buffer, index: number): number => buffer[index] ?? 0;

const decodeSelection = (frame: Frame, args: Buffer): SelectionMessage => {
  const optionBytes = args.subarray(6, 9);

  const options = SELECTION_OPTION_BITS.filter(
    ([byteIndex, mask]) => (byteAt(optionBytes, byteIndex) & mask) !== 0,
    // eslint-disable-next-line unicorn/no-unreadable-array-destructuring
  ).map(([, , option]) => option);

  if ((byteAt(optionBytes, 2) & SELECTION_MODE_MASK) === SELECTION_MODE_RAPID) {
    options.push(WashOption.RAPID);
  }

  return {
    frame,
    kind: MessageKind.SELECTION,
    optionBytes,
    options,
    program: byteAt(args, 0),
    specialMenuOpen: (byteAt(optionBytes, 2) & SELECTION_SPECIAL_MENU) !== 0,
    spin: byteAt(args, 3),
    spinRpm: args.readUInt16BE(4),
    temperature: byteAt(args, 1),
    temperatureCelsius: byteAt(args, 2),
  };
};

const decodeStatus = (
  frame: Frame,
  source: StatusSource,
  args: Buffer,
): StatusMessage => {
  const flags = byteAt(args, 2);
  const adjustingRaw = byteAt(args, 7);

  return {
    adjusting: adjustingRaw !== 0,
    adjustingRaw,
    doorLocked: (flags & STATUS_FLAG_DOOR_LOCKED) !== 0,
    doorOpen: (flags & STATUS_FLAG_DOOR_OPEN) !== 0,
    flags,
    frame,
    kind: MessageKind.STATUS,
    mode: byteAt(args, 1),
    remainingMinutes: args.readUInt16BE(5),
    source,
    spin: byteAt(args, 8),
    stage: byteAt(args, 0),
    temperature: byteAt(args, 3),
    temperatureCelsius: byteAt(args, 4),
    trailer: args.subarray(9),
  };
};

const decodePanelMessage = (
  frame: Frame,
  command: number,
  args: Buffer,
): Message | undefined => {
  switch (command) {
    case Command.SELECTION: {
      return args.length === 11 ? decodeSelection(frame, args) : undefined;
    }
    case Command.KEY_START: {
      return args.length <= 1
        ? { frame, key: PanelKey.START, kind: MessageKind.KEY }
        : undefined;
    }
    case Command.KEY_PAUSE: {
      return args.length <= 1
        ? { frame, key: PanelKey.PAUSE, kind: MessageKind.KEY }
        : undefined;
    }
    case Command.KEY_ABORT: {
      return args.length <= 1
        ? { frame, key: PanelKey.ABORT, kind: MessageKind.KEY }
        : undefined;
    }
    case Command.POWER_OFF: {
      return args.length <= 1
        ? { frame, key: PanelKey.POWER_OFF, kind: MessageKind.KEY }
        : undefined;
    }
    case Command.STATUS: {
      return args.length === 0
        ? { frame, kind: MessageKind.STATUS_REQUEST }
        : undefined;
    }
    default: {
      return undefined;
    }
  }
};

const decodeControllerMessage = (
  frame: Frame,
  command: number,
  args: Buffer,
): Message | undefined => {
  switch (command) {
    case Command.STATUS: {
      return args.length === 13
        ? decodeStatus(frame, StatusSource.UPDATE, args)
        : undefined;
    }
    case Command.SELECTION_REPLY: {
      return args.length === 13
        ? decodeStatus(frame, StatusSource.SELECTION_REPLY, args)
        : undefined;
    }
    case Command.STATUS_REPLY: {
      return args.length === 13
        ? decodeStatus(frame, StatusSource.REQUEST_REPLY, args)
        : undefined;
    }
    case Command.DISPLAY: {
      if (args.length === 3 && args[0] === DisplayItem.ACTIVITY) {
        return {
          activity: byteAt(args, 1),
          frame,
          kind: MessageKind.ACTIVITY,
          step: byteAt(args, 2),
        };
      }

      return args.length === 2 && args[0] === DisplayItem.MAX_LOAD
        ? { frame, kilograms: byteAt(args, 1) / 10, kind: MessageKind.MAX_LOAD }
        : undefined;
    }
    case Command.ESTIMATE: {
      return args.length === 13
        ? {
            energy: args.readUInt16BE(5),
            frame,
            kind: MessageKind.ESTIMATE,
            waterLitres: byteAt(args, 8),
          }
        : undefined;
    }
    case Command.POWER_OFF: {
      return args.length === 0
        ? { frame, kind: MessageKind.POWER_OFF }
        : undefined;
    }
    default: {
      return undefined;
    }
  }
};

/**
 * Interprets a data frame. Never throws; anything not understood comes back
 * as `MessageKind.UNKNOWN`.
 */
export const decodeMessage = (frame: Frame): Message => {
  const { payload, source } = frame;

  if (
    payload.length === 5 &&
    payload[0] === ACK_HEADER[0] &&
    payload[1] === ACK_HEADER[1] &&
    payload[3] === SERVICE
  ) {
    return {
      command: byteAt(payload, 4),
      frame,
      kind: MessageKind.ACK,
      status: byteAt(payload, 2),
    };
  }

  if (payload.length < 2 || payload[0] !== SERVICE) {
    return { frame, kind: MessageKind.UNKNOWN };
  }

  const command = byteAt(payload, 1);
  const args = payload.subarray(2);

  const decoded = (() => {
    switch (source) {
      case BusNode.PANEL: {
        return decodePanelMessage(frame, command, args);
      }
      case BusNode.CONTROLLER: {
        return decodeControllerMessage(frame, command, args);
      }
      default: {
        return undefined;
      }
    }
  })();

  return decoded ?? { frame, kind: MessageKind.UNKNOWN };
};

// ---------------------------------------------------------------- device

/**
 * Live view of one washing machine.
 *
 * State lives in observables that hold the latest message of each kind and
 * are `null` until that message has been seen. They are cleared when the bus
 * goes silent (appliance switched off, or bridge unreachable). A repeated
 * identical message does not replace the held object, so observers only see
 * real changes.
 *
 * Things that happen rather than persist (key presses, the raw message flow)
 * are null states: observe them, they hold no value.
 */
export class WashingMachine {
  private static _update<T extends Message>(
    observable: Observable<T | null>,
    message: T,
  ): void {
    if (observable.value?.frame.raw.equals(message.frame.raw)) return;

    observable.set(message);
  }

  private readonly _activeObserver: Observer;
  private readonly _activity = new Observable<ActivityMessage | null>(null);
  private readonly _estimate = new Observable<EstimateMessage | null>(null);
  private readonly _frameObserver: Observer;
  private readonly _isDoorLocked = new Observable<boolean | null>(null);
  private readonly _isRunning = new Observable<boolean | null>(null);
  private readonly _isRunningExcludingFreshFinish = new Observable<
    boolean | null
  >(null);

  private readonly _key = new NullState<PanelKey>();
  private readonly _maxLoad = new Observable<MaxLoadMessage | null>(null);
  private readonly _message = new NullState<Message>();
  private readonly _remainingMinutes = new Observable<number | null>(null);
  private readonly _selection = new Observable<SelectionMessage | null>(null);
  private readonly _stage = new Observable<CycleStage | null>(null);
  private readonly _status = new Observable<StatusMessage | null>(null);

  /** What the drum is doing right now. */
  readonly activity = new ReadOnlyObservable(this._activity);
  readonly bus: ApplianceBus;
  /** Consumption estimate for the current selection. */
  readonly estimate = new ReadOnlyObservable(this._estimate);
  readonly isDoorLocked = new ReadOnlyObservable(this._isDoorLocked);
  /** True while the appliance is switched on and the bridge is delivering frames. */
  readonly isOn: ReadOnlyObservable<boolean>;
  /** True from the moment Start is accepted until the end stage, including pauses. */
  readonly isRunning = new ReadOnlyObservable(this._isRunning);
  /** True from the moment Start is accepted until the end stage or freshFinish starts, including pauses. */
  readonly isRunningExcludingFreshFinish = new ReadOnlyObservable(
    this._isRunningExcludingFreshFinish,
  );

  /** A key press reported by the panel. */
  readonly key = new ReadOnlyNullState(this._key);
  readonly maxLoad = new ReadOnlyObservable(this._maxLoad);
  /** Every data message in bus order, decoded or not. Empty polls and replies are not included. */
  readonly message = new ReadOnlyNullState(this._message);
  readonly remainingMinutes = new ReadOnlyObservable(this._remainingMinutes);
  /** Programme, temperature, spin and options as currently set on the panel. */
  readonly selection = new ReadOnlyObservable(this._selection);
  readonly stage = new ReadOnlyObservable(this._stage);
  /** Latest status record from the controller, whichever command carried it. */
  readonly status = new ReadOnlyObservable(this._status);

  constructor(client: TCPClient, silenceMs?: number) {
    this.bus = new ApplianceBus(client, silenceMs);
    this.isOn = this.bus.isActive;

    this._frameObserver = this.bus.frame.observe((frame) =>
      this._handleFrame(frame),
    );

    this._activeObserver = this.bus.isActive.observe((isActive) => {
      if (!isActive) this._clear();
    });

    this._status.observe((value) => {
      if (!value) return;

      const { doorLocked, mode, remainingMinutes, stage } = value;

      this._isDoorLocked.set(value ? doorLocked : null, this._status);

      this._isRunning.set(
        value ? mode !== RunMode.SELECTING && stage !== CycleStage.END : null,
        this._status,
      );

      this._isRunningExcludingFreshFinish.set(
        value
          ? mode !== RunMode.SELECTING &&
              stage !== CycleStage.END &&
              stage !== CycleStage.FRESH_FINISH
          : null,
        this._status,
      );

      this._remainingMinutes.set(value ? remainingMinutes : null, this._status);

      this._stage.set(value ? stage : null, this._status);
    });
  }

  private _clear(): void {
    this._activity.set(null);
    this._estimate.set(null);
    this._isDoorLocked.set(null);
    this._isRunning.set(null);
    this._isRunningExcludingFreshFinish.set(null);
    this._maxLoad.set(null);
    this._remainingMinutes.set(null);
    this._selection.set(null);
    this._stage.set(null);
    this._status.set(null);
  }

  private _handleFrame(frame: Frame): void {
    if (frame.type !== FrameType.DATA) return;

    const message = decodeMessage(frame);

    switch (message.kind) {
      case MessageKind.SELECTION: {
        WashingMachine._update(this._selection, message);
        break;
      }
      case MessageKind.STATUS: {
        WashingMachine._update(this._status, message);
        break;
      }
      case MessageKind.ACTIVITY: {
        WashingMachine._update(this._activity, message);
        break;
      }
      case MessageKind.MAX_LOAD: {
        WashingMachine._update(this._maxLoad, message);
        break;
      }
      case MessageKind.ESTIMATE: {
        WashingMachine._update(this._estimate, message);
        break;
      }
      case MessageKind.KEY: {
        this._key.trigger(message.key);
        break;
      }
      default: {
        break;
      }
    }

    this._message.trigger(message);
  }

  /** Stops listening and clears all state. The `TCPClient` is left untouched. */
  dispose(): void {
    this._activeObserver.remove();
    this._frameObserver.remove();
    this.bus.dispose();
    this._clear();
  }
}
