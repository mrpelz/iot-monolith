import { NUMBER_RANGES } from '../number.js';
import { StringEncodings } from '../string.js';

export class StructMember<T = unknown, S extends number = number> {
  private _buffer?: Buffer;
  readonly size: S;

  constructor(size: S) {
    if (!size) {
      throw new Error('illegal zero length');
    }

    this.size = size;
  }

  protected get buffer(): Buffer {
    if (!this._buffer) throw new Error('no buffer set');

    return this._buffer;
  }

  get value(): T {
    throw new Error('no getter defined');
  }

  set value(_input: T) {
    throw new Error('no setter defined');
  }

  allocate(): Buffer {
    this._buffer = Buffer.alloc(this.size);

    return this._buffer;
  }

  assign(buffer: Buffer): void {
    if (buffer.length !== this.size) {
      throw new Error('assigned buffer does not match requred size');
    }

    this._buffer = buffer;
  }

  decode(input: Buffer): T {
    this.assign(input);
    const result = this.value;

    this.unassign();

    return result;
  }

  encode(input: T): Buffer {
    const result = this.allocate();
    this.value = input;

    this.unassign();

    return result;
  }

  unassign(): void {
    this._buffer = undefined;
  }
}

export class FixedBuffer extends StructMember<Buffer> {
  private readonly _fixedValue: Buffer;

  constructor(fixedValue: Buffer) {
    super(fixedValue.length);

    this._fixedValue = fixedValue;
  }

  get value(): Buffer {
    return this.buffer;
  }

  set value(_input: Buffer) {
    // noop
  }

  allocate(): Buffer {
    const result = super.allocate();
    this._fixedValue.copy(this.buffer);

    return result;
  }

  assign(buffer: Buffer): void {
    super.assign(buffer);
    this._fixedValue.copy(this.buffer);
  }
}

export const staticValue = <T>(
  value: T,
  member: StructMember<T>,
): FixedBuffer => new FixedBuffer(member.encode(value));

export class StaticBuffer extends StructMember<Buffer> {
  get value(): Buffer {
    const result = Buffer.alloc(this.size);
    this.buffer.copy(result);

    return result;
  }

  set value(input: Buffer) {
    if (input.length !== this.size) {
      throw new Error('input buffer does not match requred size');
    }

    input.copy(this.buffer);
  }
}

export class Bool extends StructMember<boolean> {
  static readonly size = 1;

  constructor() {
    super(Bool.size);
  }

  get value(): boolean {
    return Boolean(this.buffer.readUInt8());
  }

  set value(input: boolean) {
    this.buffer.writeUInt8(input ? 1 : 0);
  }
}

export type TBitmap = [
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
];

export class Bitmap extends StructMember<TBitmap> {
  static readonly size = 1;

  constructor() {
    super(Bitmap.size);
  }

  get value(): TBitmap {
    const byte = this.buffer.readUInt8();

    const result = [] as unknown as TBitmap;

    for (let index = 0; index < 8; index += 1) {
      // eslint-disable-next-line no-bitwise
      result[index] = Boolean(byte & (1 << index));
    }

    return result;
  }

  set value(input: TBitmap) {
    this.buffer.writeUInt8(
      input.reduce(
        // eslint-disable-next-line no-bitwise
        (accumulator, value, index) => accumulator | (value ? 1 : 0 << index),
        0,
      ),
    );
  }
}

export enum StringPadding {
  NONE,
  START,
  END,
}

export type StringOptions = {
  encoding?: StringEncodings;
  fill?: string;
  padding?: StringPadding;
  unpad?: boolean;
};

export class StaticString extends StructMember<string> {
  private readonly _encoding: StringEncodings;
  private readonly _fill: string;
  private readonly _padding: StringPadding;
  private readonly _unpad: boolean;

  constructor(
    length: number,
    {
      encoding = 'ascii',
      padding = StringPadding.START,
      fill = '\0',
      unpad = true,
    }: StringOptions = {},
  ) {
    super(length);

    this._encoding = encoding;
    this._padding = padding;
    this._fill = fill;
    this._unpad = unpad;
  }

  get value(): string {
    if (this._padding !== StringPadding.NONE && this._unpad) {
      return this.buffer.toString(this._encoding).replaceAll(this._fill, '');
    }

    return this.buffer.toString(this._encoding);
  }

  set value(input: string) {
    if (input.length > this.size) {
      throw new Error('string too long');
    }

    if (this._padding === StringPadding.NONE && input.length < this.size) {
      throw new Error('padding=none and string too short');
    }

    switch (this._padding) {
      case StringPadding.START: {
        this.buffer.write(
          input.padStart(this.size, this._fill),
          this._encoding,
        );
        break;
      }
      case StringPadding.END: {
        this.buffer.write(input.padEnd(this.size, this._fill), this._encoding);
        break;
      }
      default: {
        this.buffer.write(input, this._encoding);
      }
    }
  }
}

export type IntegerStructByteCount = 1 | 2 | 3 | 4 | 5 | 6;

class IntegerStructMember<
  T extends IntegerStructByteCount,
> extends StructMember<number, T> {
  protected static contraint(
    input: number,
    [min, max]: readonly [number, number],
  ): void {
    if (!Number.isInteger(input)) throw new Error('input is not integer');

    if (input < min) {
      throw new Error(`input below representable value (${min})`);
    }

    if (input > max) {
      throw new Error(`input above representable value (${min})`);
    }
  }

  constructor(bytes: T = 2 as T) {
    super(bytes);
  }
}

export class UInt8<T extends number = number> extends IntegerStructMember<1> {
  static readonly size = 1;

  protected static contraint(input: number): void {
    super.contraint(input, NUMBER_RANGES.uint[UInt8.size]);
  }

  constructor() {
    super(UInt8.size);
  }

  get value(): T {
    return this.buffer.readUInt8() as T;
  }

  set value(input: T) {
    UInt8.contraint(input);

    this.buffer.writeUInt8(input);
  }
}

export class UIntBE extends IntegerStructMember<
  Exclude<IntegerStructByteCount, 1>
> {
  get value(): number {
    return this.buffer.readUIntBE(0, this.size);
  }

  set value(input: number) {
    UIntBE.contraint(input, NUMBER_RANGES.uint[this.size]);

    this.buffer.writeUIntBE(input, 0, this.size);
  }
}

export class UIntLE extends IntegerStructMember<
  Exclude<IntegerStructByteCount, 1>
> {
  get value(): number {
    return this.buffer.readUIntLE(0, this.size);
  }

  set value(input: number) {
    UIntBE.contraint(input, NUMBER_RANGES.uint[this.size]);

    this.buffer.writeUIntLE(input, 0, this.size);
  }
}

export class Int8 extends IntegerStructMember<1> {
  static readonly size = 1;

  protected static contraint(input: number): void {
    super.contraint(input, NUMBER_RANGES.uint[Int8.size]);
  }

  constructor() {
    super(Int8.size);
  }

  get value(): number {
    return this.buffer.readInt8();
  }

  set value(input: number) {
    Int8.contraint(input);

    this.buffer.writeInt8(input);
  }
}

export class IntBE extends IntegerStructMember<
  Exclude<IntegerStructByteCount, 1>
> {
  get value(): number {
    return this.buffer.readIntBE(0, this.size);
  }

  set value(input: number) {
    UIntBE.contraint(input, NUMBER_RANGES.int[this.size]);

    this.buffer.writeIntBE(input, 0, this.size);
  }
}

export class IntLE extends IntegerStructMember<
  Exclude<IntegerStructByteCount, 1>
> {
  get value(): number {
    return this.buffer.readIntLE(0, this.size);
  }

  set value(input: number) {
    UIntBE.contraint(input, NUMBER_RANGES.int[this.size]);

    this.buffer.writeIntLE(input, 0, this.size);
  }
}

class FloatStructMember extends StructMember<number> {
  static readonly maxValue = 340_282_346_638_528_859_811_704_183_484_516_925_440;
  static readonly minValue =
    -340_282_346_638_528_859_811_704_183_484_516_925_440;

  static readonly size = 4;

  protected static constraint(input: number): void {
    if (!Number.isFinite(input)) throw new Error('input is not finite');

    if (input < FloatStructMember.minValue) {
      throw new Error(
        `input below representable value (${FloatStructMember.minValue})`,
      );
    }

    if (input > FloatStructMember.maxValue) {
      throw new Error(
        `input above representable value (${FloatStructMember.maxValue})`,
      );
    }
  }

  constructor() {
    super(FloatStructMember.size);
  }
}

export class FloatBE extends FloatStructMember {
  get value(): number {
    return this.buffer.readFloatBE();
  }

  set value(input: number) {
    FloatBE.constraint(input);

    this.buffer.writeFloatBE(input);
  }
}

export class FloatLE extends FloatStructMember {
  get value(): number {
    return this.buffer.readFloatLE();
  }

  set value(input: number) {
    FloatLE.constraint(input);

    this.buffer.writeFloatLE(input);
  }
}

class DoubleStructMember extends StructMember<number> {
  static readonly maxValue =
    179_769_313_486_231_570_814_527_423_731_704_356_798_070_567_525_844_996_598_917_476_803_157_260_780_028_538_760_589_558_632_766_878_171_540_458_953_514_382_464_234_321_326_889_464_182_768_467_546_703_537_516_986_049_910_576_551_282_076_245_490_090_389_328_944_075_868_508_455_133_942_304_583_236_903_222_948_165_808_559_332_123_348_274_797_826_204_144_723_168_738_177_180_919_299_881_250_404_026_184_124_858_368n;

  static readonly minValue =
    -179_769_313_486_231_570_814_527_423_731_704_356_798_070_567_525_844_996_598_917_476_803_157_260_780_028_538_760_589_558_632_766_878_171_540_458_953_514_382_464_234_321_326_889_464_182_768_467_546_703_537_516_986_049_910_576_551_282_076_245_490_090_389_328_944_075_868_508_455_133_942_304_583_236_903_222_948_165_808_559_332_123_348_274_797_826_204_144_723_168_738_177_180_919_299_881_250_404_026_184_124_858_368n;

  static readonly size = 8;

  protected static constraint(input: number): void {
    if (!Number.isFinite(input)) throw new Error('input is not finite');

    if (input < DoubleStructMember.minValue) {
      throw new Error(
        `input below representable value (${DoubleStructMember.minValue})`,
      );
    }

    if (input > DoubleStructMember.maxValue) {
      throw new Error(
        `input above representable value (${DoubleStructMember.maxValue})`,
      );
    }
  }

  constructor() {
    super(DoubleStructMember.size);
  }
}

export class DoubleBE extends DoubleStructMember {
  get value(): number {
    return this.buffer.readDoubleBE();
  }

  set value(input: number) {
    DoubleBE.constraint(input);

    this.buffer.writeDoubleBE(input);
  }
}

export class DoubleLE extends DoubleStructMember {
  get value(): number {
    return this.buffer.readDoubleLE();
  }

  set value(input: number) {
    DoubleLE.constraint(input);

    this.buffer.writeDoubleLE(input);
  }
}

export type TStructMember<T = unknown> =
  | StructMember<T>
  | Struct<StructMembers>
  | MappedStruct<Record<string, TStructMember>>;

export type StructMembers = TStructMember[];
export type StructMemberValues<T extends StructMembers> = {
  [P in keyof T]: T[P] extends FixedBuffer ? undefined : T[P]['value'];
};

export type MappedStructMembers = Record<string, TStructMember>;
export type MappedStructMemberValues<T extends MappedStructMembers> = {
  [P in keyof T as T[P] extends FixedBuffer ? never : P]: T[P]['value'];
};

export enum DecodeOpenendedAlignment {
  START,
  END,
}

export class Struct<T extends StructMembers> {
  private static _assignSubarrays<M extends StructMembers>(
    buffer: Buffer,
    members: M,
  ): void {
    let offset = 0;

    for (const member of members) {
      const end = offset + member.size;

      member.assign(buffer.subarray(offset, end));

      offset = end;
    }
  }

  private static _calculateSize<M extends { size: number }[]>(
    members: M,
  ): number {
    return members.reduce((accumulator, { size }) => accumulator + size, 0);
  }

  private static _unassignSubarrays<M extends StructMembers>(members: M): void {
    for (const member of members) {
      member.unassign();
    }
  }

  private _buffer?: Buffer;
  private readonly _members: T;
  readonly size: number;

  constructor(...members: T) {
    this._members = members;
    this.size = Struct._calculateSize(this._members);
  }

  get value(): StructMemberValues<T> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this._members.map((member) => member.value);
  }

  set value(input: StructMemberValues<T>) {
    for (const [index, memberInput] of input.entries()) {
      const object = this._members[index];
      if (object) object.value = memberInput;
    }
  }

  allocate(): Buffer {
    this._buffer = Buffer.alloc(this.size);

    Struct._assignSubarrays(this._buffer, this._members);

    return this._buffer;
  }

  assign(buffer: Buffer): void {
    if (buffer.length !== this.size) {
      throw new Error('assigned buffer does not match requred size');
    }

    this._buffer = buffer;

    Struct._assignSubarrays(this._buffer, this._members);
  }

  decode(input: Buffer): StructMemberValues<T> {
    this.assign(input);
    const result = this.value;

    this.unassign();

    return result;
  }

  decodeOpenended(
    input: Buffer,
    alignment: DecodeOpenendedAlignment = DecodeOpenendedAlignment.START,
  ): [StructMemberValues<T>, Buffer] {
    if (input.length < this.size) {
      throw new Error('input buffer too short');
    }

    const cutoff =
      alignment === DecodeOpenendedAlignment.START
        ? this.size
        : input.length - this.size;

    return [this.decode(input.subarray(0, cutoff)), input.subarray(cutoff)];
  }

  encode(input: StructMemberValues<T>): Buffer {
    const result = this.allocate();
    this.value = input;

    this.unassign();

    return result;
  }

  unassign(): void {
    Struct._unassignSubarrays(this._members);

    this._buffer = undefined;
  }
}

export class MappedStruct<T extends MappedStructMembers> {
  private static _assignSubarrays<M extends MappedStructMembers>(
    buffer: Buffer,
    members: M,
  ): void {
    let offset = 0;

    for (const member of Object.values(members)) {
      const end = offset + member.size;

      member.assign(buffer.subarray(offset, end));

      offset = end;
    }
  }

  private static _calculateSize<M extends MappedStructMembers>(
    members: M,
  ): number {
    return Object.values(members).reduce(
      (accumulator, { size }) => accumulator + size,
      0,
    );
  }

  private static _unassignSubarrays<M extends MappedStructMembers>(
    members: M,
  ): void {
    for (const member of Object.values(members)) {
      member.unassign();
    }
  }

  private _buffer?: Buffer;
  private readonly _members: T;
  readonly size: number;

  constructor(members: T) {
    this._members = members;
    this.size = MappedStruct._calculateSize(this._members);
  }

  get value(): MappedStructMemberValues<T> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return Object.fromEntries(
      Object.entries(this._members).map(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ([property, member]) => [property, member.value] as const,
      ),
    );
  }

  set value(input: MappedStructMemberValues<T>) {
    for (const [property, memberInput] of Object.entries(input)) {
      const object = this._members[property];
      if (object) object.value = memberInput;
    }
  }

  allocate(): Buffer {
    this._buffer = Buffer.alloc(this.size);

    MappedStruct._assignSubarrays(this._buffer, this._members);

    return this._buffer;
  }

  assign(buffer: Buffer): void {
    if (buffer.length !== this.size) {
      throw new Error('assigned buffer does not match requred size');
    }

    this._buffer = buffer;

    MappedStruct._assignSubarrays(this._buffer, this._members);
  }

  decode(input: Buffer): MappedStructMemberValues<T> {
    this.assign(input);
    const result = this.value;

    this.unassign();

    return result;
  }

  decodeOpenended(
    input: Buffer,
    alignment: DecodeOpenendedAlignment = DecodeOpenendedAlignment.START,
  ): [MappedStructMemberValues<T>, Buffer] {
    if (input.length < this.size) {
      throw new Error('input buffer too short');
    }

    const cutoff =
      alignment === DecodeOpenendedAlignment.START
        ? this.size
        : input.length - this.size;

    return [this.decode(input.subarray(0, cutoff)), input.subarray(cutoff)];
  }

  encode(input: MappedStructMemberValues<T>): Buffer {
    const result = this.allocate();
    this.value = input;

    this.unassign();

    return result;
  }

  unassign(): void {
    MappedStruct._unassignSubarrays(this._members);

    this._buffer = undefined;
  }
}

export type TStruct<
  T extends Struct<StructMembers> | MappedStruct<MappedStructMembers>,
> = T['value'];
