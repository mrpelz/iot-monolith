/* eslint-disable no-bitwise */
/**
 * Heat-pump dryer on an `ApplianceBus`: message decoding and live state.
 *
 * Node 1 is the main controller (bus master), node 3 the control panel.
 * Application messages have the washing machine's shape with service byte
 * 0x2d: `2d <command> <args…>`, acknowledged with `01 21 <status> 2d <command>`.
 *
 * Only fields confirmed against the display or a deliberate action are
 * decoded. Everything else stays reachable through `message.frame`; values
 * that are not in an enum (yet) pass through as plain numbers.
 */

import { Observable, Observer, ReadOnlyObservable } from '@mrpelz/observable';
import { NullState, ReadOnlyNullState } from '@mrpelz/observable/state';

import type { TCPClient } from '../tcp-client.js';
import {
  ApplianceBus,
  type Frame,
  FrameType,
  Resolved,
  resolveLabel,
} from './appliance-bus.js';

// ---------------------------------------------------------------- enums

export enum DryerBusNode {
  CONTROLLER = 0x1,
  PANEL = 0x3,
}

export const DRYER_BUS_NODE_LABELS = {
  [DryerBusNode.CONTROLLER]: 'Controller',
  [DryerBusNode.PANEL]: 'Panel',
} as const satisfies Record<DryerBusNode, string>;

export enum DryerMessageKind {
  ACK = 'ACK',
  KEY = 'KEY',
  SELECTION = 'SELECTION',
  SELECTION_REPLY = 'SELECTION_REPLY',
  STATUS = 'STATUS',
  STATUS_REQUEST = 'STATUS_REQUEST',
  TIME_UPDATE = 'TIME_UPDATE',
  UNKNOWN = 'UNKNOWN',
}

export enum DryerAckStatus {
  OK = 0x00,
}

export const DRYER_ACK_STATUS_LABELS = {
  [DryerAckStatus.OK]: 'OK',
} as const satisfies Record<DryerAckStatus, string>;

export enum DryerProgram {
  COTTON = 0x01,
  ECO_COTTON = 0x02,
  SYNTHETICS = 0x03,
  DELICATES = 0x04,
  MIXED = 0x05,
  OUTDOOR = 0x08,
  WOOL = 0x0a,
  JEANS = 0x0c,
  SPORT = 0x0d,
  BIG_ITEMS = 0x10,
  DOWN = 0x15,
  AIRING = 0x16,
  STEAM_REFRESH = 0x17,
  DRYING_TIME = 0x18,
  MINI_LOAD = 0x19,
}

export const DRYER_PROGRAM_LABELS = {
  [DryerProgram.COTTON]: 'Cotton',
  [DryerProgram.ECO_COTTON]: 'Eco Cotton',
  [DryerProgram.SYNTHETICS]: 'Synthetics',
  [DryerProgram.DELICATES]: 'Delicates',
  [DryerProgram.MIXED]: 'Mixed',
  [DryerProgram.OUTDOOR]: 'Outdoor',
  [DryerProgram.WOOL]: 'Wool',
  [DryerProgram.JEANS]: 'Jeans',
  [DryerProgram.SPORT]: 'Sport',
  [DryerProgram.BIG_ITEMS]: 'Big Items',
  [DryerProgram.DOWN]: 'Down',
  [DryerProgram.AIRING]: 'Airing',
  [DryerProgram.STEAM_REFRESH]: 'Steam Refresh',
  [DryerProgram.DRYING_TIME]: 'Drying Time',
  [DryerProgram.MINI_LOAD]: 'Mini Load',
} as const satisfies Record<DryerProgram, string>;

export enum DrynessLevel {
  /** Sent by the timed programmes (Airing, Drying time), which have no dryness level. */
  NONE = 0x01,
  IRON_DRY = 0x02,
  CUPBOARD_DRY = 0x04,
  EXTRA_DRY = 0x10,
}

export const DRYNESS_LEVEL_LABELS = {
  [DrynessLevel.NONE]: 'None',
  [DrynessLevel.IRON_DRY]: 'Iron dry',
  [DrynessLevel.CUPBOARD_DRY]: 'Cupboard dry',
  [DrynessLevel.EXTRA_DRY]: 'Extra dry',
} as const satisfies Record<DrynessLevel, string>;

export enum DryerOption {
  FRESH_CARE = 'FRESH_CARE',
  GENTLE = 'GENTLE',
  RAPID = 'RAPID',
  STEAM = 'STEAM',
}

export enum DryerPanelKey {
  ABORT = 'ABORT',
  PAUSE = 'PAUSE',
  POWER_OFF = 'POWER_OFF',
  POWER_ON = 'POWER_ON',
  /** Also sent to resume after a pause. */
  START = 'START',
}

/** Which controller command carried a status record. */
export enum DryerStatusSource {
  /** Unsolicited update (0x0b). */
  UPDATE = 0x0b,
  /** Answer to a status request from the panel (0x29). */
  REQUEST_REPLY = 0x29,
}

export const DRYER_STATUS_SOURCE_LABELS = {
  [DryerStatusSource.UPDATE]: 'Update',
  [DryerStatusSource.REQUEST_REPLY]: 'Request reply',
} as const satisfies Record<DryerStatusSource, string>;

/** Values 0x01, 0x02, 0x03, 0x05 and 0x09 also occur, briefly, at transitions. */
export enum DryerPhase {
  IDLE = 0x00,
  /** Display shows "Trocknen". */
  DRYING = 0x04,
  /** Display shows "Abkühlen". */
  COOLING = 0x06,
  /** Display shows "Programmende". */
  END = 0x0a,
}

export const DRYER_PHASE_LABELS = {
  [DryerPhase.IDLE]: 'Idle',
  [DryerPhase.DRYING]: 'Drying',
  [DryerPhase.COOLING]: 'Cooling',
  [DryerPhase.END]: 'End',
} as const satisfies Record<DryerPhase, string>;

export enum DryerRunMode {
  SELECTING = 0x01,
  RUNNING = 0x03,
  PAUSED = 0x07,
  POWERING_OFF = 0x08,
}

export const DRYER_RUN_MODE_LABELS = {
  [DryerRunMode.SELECTING]: 'Selecting',
  [DryerRunMode.RUNNING]: 'Running',
  [DryerRunMode.PAUSED]: 'Paused',
  [DryerRunMode.POWERING_OFF]: 'Powering off',
} as const satisfies Record<DryerRunMode, string>;

// ---------------------------------------------------------------- messages

type MessageBase = {
  frame: Frame;
};

export type DryerAckMessage = MessageBase & {
  /** Command byte of the message being acknowledged. */
  command: number;
  kind: DryerMessageKind.ACK;
  status: DryerAckStatus;
};

export type DryerKeyMessage = MessageBase & {
  key: DryerPanelKey;
  kind: DryerMessageKind.KEY;
};

export type DryerSelectionMessage = MessageBase & {
  /** Set time in minutes; only meaningful for the timed programmes, otherwise 0. */
  dryingTimeMinutes: number;
  dryness: DrynessLevel;
  kind: DryerMessageKind.SELECTION;
  options: DryerOption[];
  program: DryerProgram;
};

export type DryerSelectionReplyMessage = MessageBase & {
  kind: DryerMessageKind.SELECTION_REPLY;
  program: DryerProgram;
  /** Nominal duration of the selection, as shown before the load is measured. */
  programMinutes: number;
};

export type DryerStatusMessage = MessageBase & {
  /**
   * True during the short tumbling bursts after the programme end
   * ("Knitterschutz"): about 20 s in every 80 s. Not set while drying.
   */
  antiCreaseTumbling: boolean;
  /** Display shows "Bodenfilter reinigen"; cleared by taking the filter out. */
  bottomFilterNeedsCleaning: boolean;
  bottomFilterPresent: boolean;
  doorClosed: boolean;
  kind: DryerMessageKind.STATUS;
  mode: DryerRunMode;
  phase: DryerPhase;
  source: DryerStatusSource;
};

export type DryerStatusRequestMessage = MessageBase & {
  kind: DryerMessageKind.STATUS_REQUEST;
};

export type DryerTimeUpdateMessage = MessageBase & {
  kind: DryerMessageKind.TIME_UPDATE;
  program: DryerProgram;
  /** New estimate after the dryer measured the load, or entered a new phase. */
  remainingMinutes: number;
};

export type DryerUnknownMessage = MessageBase & {
  kind: DryerMessageKind.UNKNOWN;
};

export type DryerMessage =
  | DryerAckMessage
  | DryerKeyMessage
  | DryerSelectionMessage
  | DryerSelectionReplyMessage
  | DryerStatusMessage
  | DryerStatusRequestMessage
  | DryerTimeUpdateMessage
  | DryerUnknownMessage;

// ---------------------------------------------------------------- decoding

const SERVICE = 0x2d;
const ACK_HEADER = [0x01, 0x21] as const;

enum Command {
  KEY_START = 0x01,
  KEY_PAUSE = 0x02,
  KEY_ABORT = 0x03,
  SELECTION = 0x04,
  POWER = 0x06,
  STATUS_REQUEST = 0x09,
  TIME_UPDATE = 0x0a,
  STATUS = 0x0b,
  SELECTION_REPLY = 0x24,
  STATUS_REPLY = 0x29,
}

enum PowerArgument {
  OFF = 0x01,
  ON = 0x02,
}

const SELECTION_OPTION_BITS: readonly (readonly [
  mask: number,
  option: DryerOption,
])[] = [
  [0x01, DryerOption.GENTLE],
  [0x04, DryerOption.FRESH_CARE],
  [0x08, DryerOption.RAPID],
  [0x80, DryerOption.STEAM],
];

const STATUS_FLAG_DOOR_CLOSED = 0x01;
const STATUS_FLAG_BOTTOM_FILTER_PRESENT = 0x02;
const STATUS_FLAG_BOTTOM_FILTER_NEEDS_CLEANING = 0x10;
const STATUS_FLAG_ANTI_CREASE_TUMBLING = 0x80;

const byteAt = (buffer: Buffer, index: number): number => buffer[index] ?? 0;

const decodeSelection = (frame: Frame, args: Buffer): DryerSelectionMessage => {
  const optionByte = byteAt(args, 3);

  return {
    dryingTimeMinutes: byteAt(args, 5),
    dryness: byteAt(args, 1),
    frame,
    kind: DryerMessageKind.SELECTION,
    options: SELECTION_OPTION_BITS.filter(
      ([mask]) => (optionByte & mask) !== 0,
    ).map(([, option]) => option),
    program: byteAt(args, 0),
  };
};

const decodeStatus = (
  frame: Frame,
  source: DryerStatusSource,
  args: Buffer,
): DryerStatusMessage => {
  const flags = byteAt(args, 3);

  return {
    antiCreaseTumbling: (flags & STATUS_FLAG_ANTI_CREASE_TUMBLING) !== 0,
    bottomFilterNeedsCleaning:
      (flags & STATUS_FLAG_BOTTOM_FILTER_NEEDS_CLEANING) !== 0,
    bottomFilterPresent: (flags & STATUS_FLAG_BOTTOM_FILTER_PRESENT) !== 0,
    doorClosed: (flags & STATUS_FLAG_DOOR_CLOSED) !== 0,
    frame,
    kind: DryerMessageKind.STATUS,
    mode: byteAt(args, 1),
    phase: byteAt(args, 0),
    source,
  };
};

const decodePanelMessage = (
  frame: Frame,
  command: number,
  args: Buffer,
): DryerMessage | undefined => {
  switch (command) {
    case Command.SELECTION: {
      return args.length === 7 ? decodeSelection(frame, args) : undefined;
    }
    case Command.KEY_START: {
      return args.length <= 1
        ? { frame, key: DryerPanelKey.START, kind: DryerMessageKind.KEY }
        : undefined;
    }
    case Command.KEY_PAUSE: {
      return args.length === 0
        ? { frame, key: DryerPanelKey.PAUSE, kind: DryerMessageKind.KEY }
        : undefined;
    }
    case Command.KEY_ABORT: {
      return args.length === 0
        ? { frame, key: DryerPanelKey.ABORT, kind: DryerMessageKind.KEY }
        : undefined;
    }
    case Command.POWER: {
      if (args.length !== 1) return undefined;

      switch (args[0]) {
        case PowerArgument.ON: {
          return {
            frame,
            key: DryerPanelKey.POWER_ON,
            kind: DryerMessageKind.KEY,
          };
        }
        case PowerArgument.OFF: {
          return {
            frame,
            key: DryerPanelKey.POWER_OFF,
            kind: DryerMessageKind.KEY,
          };
        }
        default: {
          return undefined;
        }
      }
    }
    case Command.STATUS_REQUEST: {
      return args.length === 0
        ? { frame, kind: DryerMessageKind.STATUS_REQUEST }
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
): DryerMessage | undefined => {
  switch (command) {
    case Command.STATUS: {
      return args.length === 5
        ? decodeStatus(frame, DryerStatusSource.UPDATE, args)
        : undefined;
    }
    case Command.STATUS_REPLY: {
      return args.length === 5
        ? decodeStatus(frame, DryerStatusSource.REQUEST_REPLY, args)
        : undefined;
    }
    case Command.SELECTION_REPLY: {
      return args.length === 7
        ? {
            frame,
            kind: DryerMessageKind.SELECTION_REPLY,
            program: byteAt(args, 0),
            programMinutes: args.readUInt16BE(1),
          }
        : undefined;
    }
    case Command.TIME_UPDATE: {
      return args.length === 6
        ? {
            frame,
            kind: DryerMessageKind.TIME_UPDATE,
            program: byteAt(args, 0),
            remainingMinutes: args.readUInt16BE(1),
          }
        : undefined;
    }
    default: {
      return undefined;
    }
  }
};

/**
 * Interprets a data frame. Never throws; anything not understood comes back
 * as `DryerMessageKind.UNKNOWN`.
 */
export const decodeDryerMessage = (frame: Frame): DryerMessage => {
  const { destination, payload, source } = frame;

  if (
    payload.length === 5 &&
    payload[0] === ACK_HEADER[0] &&
    payload[1] === ACK_HEADER[1] &&
    payload[3] === SERVICE
  ) {
    return {
      command: byteAt(payload, 4),
      frame,
      kind: DryerMessageKind.ACK,
      status: byteAt(payload, 2),
    };
  }

  if (payload.length < 2 || payload[0] !== SERVICE) {
    return { frame, kind: DryerMessageKind.UNKNOWN };
  }

  const command = byteAt(payload, 1);
  const args = payload.subarray(2);

  const decoded = (() => {
    if (
      source === DryerBusNode.PANEL &&
      destination === DryerBusNode.CONTROLLER
    ) {
      return decodePanelMessage(frame, command, args);
    }

    return source === DryerBusNode.CONTROLLER &&
      destination === DryerBusNode.PANEL
      ? decodeControllerMessage(frame, command, args)
      : undefined;
  })();

  return decoded ?? { frame, kind: DryerMessageKind.UNKNOWN };
};

export type ResolvedDryerSelection = Resolved<
  DryerSelectionMessage,
  'dryness' | 'program'
>;

export const resolveDryerSelection = (
  message: DryerSelectionMessage,
): ResolvedDryerSelection => ({
  ...message,
  dryness: resolveLabel(DRYNESS_LEVEL_LABELS, message.dryness),
  program: resolveLabel(DRYER_PROGRAM_LABELS, message.program),
});

export type ResolvedDryerStatus = Resolved<
  DryerStatusMessage,
  'mode' | 'phase' | 'source'
>;

export const resolveDryerStatus = (
  message: DryerStatusMessage,
): ResolvedDryerStatus => ({
  ...message,
  mode: resolveLabel(DRYER_RUN_MODE_LABELS, message.mode),
  phase: resolveLabel(DRYER_PHASE_LABELS, message.phase),
  source: resolveLabel(DRYER_STATUS_SOURCE_LABELS, message.source),
});

// ---------------------------------------------------------------- device

/**
 * Live view of one dryer.
 *
 * `selection` and `status` hold the latest message of their kind and are
 * `null` until it has been seen. The single-value observables are fed from
 * those and only report when their own value changes. Everything is cleared
 * when the bus goes silent (appliance switched off, or bridge unreachable).
 *
 * Things that happen rather than persist (key presses, the raw message flow)
 * are null states: observe them, they hold no value.
 */
export class Dryer {
  private static _update<T extends DryerMessage>(
    observable: Observable<T | null>,
    message: T,
  ): void {
    if (observable.value?.frame.raw.equals(message.frame.raw)) return;

    observable.set(message);
  }

  private readonly _activeObserver: Observer;
  private readonly _frameObserver: Observer;
  private readonly _isAntiCreaseTumbling = new Observable<boolean | null>(null);

  private readonly _isBottomFilterNeedsCleaning = new Observable<
    boolean | null
  >(null);

  private readonly _isBottomFilterPresent = new Observable<boolean | null>(
    null,
  );

  private readonly _isDoorOpen = new Observable<boolean | null>(null);
  private readonly _isRunning = new Observable<boolean | null>(null);
  private readonly _isRunningExcludingFreshFinish = new Observable<
    boolean | null
  >(null);

  private readonly _key = new NullState<DryerPanelKey>();
  private readonly _message = new NullState<DryerMessage>();
  private readonly _mode = new Observable<DryerRunMode | null>(null);

  private readonly _phase = new Observable<DryerPhase | null>(null);
  private readonly _remainingMinutes = new Observable<number | null>(null);
  private readonly _selection = new Observable<DryerSelectionMessage | null>(
    null,
  );

  private readonly _status = new Observable<DryerStatusMessage | null>(null);

  readonly bus: ApplianceBus;
  /** True during each tumbling burst of the anti-crease period after the programme end. */
  readonly isAntiCreaseTumbling = new ReadOnlyObservable(
    this._isAntiCreaseTumbling,
  );

  /** True while the display asks for the bottom filter to be cleaned. */
  readonly isBottomFilterNeedsCleaning = new ReadOnlyObservable(
    this._isBottomFilterNeedsCleaning,
  );

  readonly isBottomFilterPresent = new ReadOnlyObservable(
    this._isBottomFilterPresent,
  );

  readonly isDoorOpen = new ReadOnlyObservable(this._isDoorOpen);
  /** True while the appliance is switched on and the bridge is delivering frames. */
  readonly isOn: ReadOnlyObservable<boolean>;
  /**
   * True from the moment Start is accepted until the programme is cancelled,
   * the door is opened after the end, or the dryer is switched off. Includes
   * pauses and the anti-crease period ("Knitterschutz") after the programme end.
   */
  readonly isRunning = new ReadOnlyObservable(this._isRunning);
  /** True from the moment Start is accepted until the end phase, including pauses. */
  readonly isRunningExcludingFreshFinish = new ReadOnlyObservable(
    this._isRunningExcludingFreshFinish,
  );

  /** A key press reported by the panel. */
  readonly key = new ReadOnlyNullState(this._key);
  /** Every data message in bus order, decoded or not. Empty polls and replies are not included. */
  readonly message = new ReadOnlyNullState(this._message);
  readonly mode = new ReadOnlyObservable(this._mode);

  readonly phase = new ReadOnlyObservable(this._phase);
  /**
   * Minutes as last reported by the controller: the nominal programme time
   * after a selection, then each new estimate during a run. The panel counts
   * down by itself in between, so this steps rather than ticks.
   */
  readonly remainingMinutes = new ReadOnlyObservable(this._remainingMinutes);
  /** Programme, dryness level and options as currently set on the panel. */
  readonly selection = new ReadOnlyObservable(this._selection);
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
      if (!value) {
        this._isAntiCreaseTumbling.set(null, this._status);
        this._isBottomFilterPresent.set(null, this._status);
        this._isDoorOpen.set(null, this._status);
        this._isRunning.set(null, this._status);
        this._isRunningExcludingFreshFinish.set(null, this._status);
        this._mode.set(null, this._status);
        this._isBottomFilterNeedsCleaning.set(null, this._status);
        this._phase.set(null, this._status);

        return;
      }

      const {
        antiCreaseTumbling,
        bottomFilterNeedsCleaning,
        bottomFilterPresent,
        doorClosed,
        mode,
        phase,
      } = value;

      const isStarted =
        mode === DryerRunMode.RUNNING || mode === DryerRunMode.PAUSED;

      this._isAntiCreaseTumbling.set(antiCreaseTumbling, this._status);
      this._isBottomFilterPresent.set(bottomFilterPresent, this._status);
      this._isDoorOpen.set(!doorClosed, this._status);
      this._isRunning.set(isStarted, this._status);

      this._isRunningExcludingFreshFinish.set(
        isStarted && phase !== DryerPhase.END,
        this._status,
      );

      this._mode.set(mode, this._status);
      this._isBottomFilterNeedsCleaning.set(
        bottomFilterNeedsCleaning,
        this._status,
      );

      this._phase.set(phase, this._status);
    });
  }

  private _clear(): void {
    this._remainingMinutes.set(null);
    this._selection.set(null);
    this._status.set(null);
  }

  private _handleFrame(frame: Frame): void {
    if (frame.type !== FrameType.DATA) return;

    const message = decodeDryerMessage(frame);

    switch (message.kind) {
      case DryerMessageKind.SELECTION: {
        Dryer._update(this._selection, message);
        break;
      }
      case DryerMessageKind.STATUS: {
        Dryer._update(this._status, message);
        break;
      }
      case DryerMessageKind.SELECTION_REPLY: {
        this._remainingMinutes.set(message.programMinutes);
        break;
      }
      case DryerMessageKind.TIME_UPDATE: {
        this._remainingMinutes.set(message.remainingMinutes);
        break;
      }
      case DryerMessageKind.KEY: {
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
