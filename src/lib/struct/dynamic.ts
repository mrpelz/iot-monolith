/* eslint-disable sort-keys */

import { DynamicStringEncodings, StringEncodings } from '../string.js';
import {
  FixedBuffer,
  MappedStruct,
  Struct,
  StructMember,
  TStructMember,
} from './main.js';

export class DynamicStructMember<T = unknown> {
  private _buffer?: Buffer;
  readonly maxSize: number;

  constructor(maxSize = Infinity) {
    this.maxSize = maxSize;
  }

  get buffer(): Buffer {
    if (!this._buffer) throw new Error('no buffer set');

    return this._buffer;
  }

  protected set buffer(input: Buffer) {
    if (input.length > this.maxSize) {
      throw new Error('input buffer exceeds maxSize');
    }

    this._buffer = input;
  }

  get value(): T {
    throw new Error('no getter defined');
  }

  set value(_input: T) {
    throw new Error('no setter defined');
  }

  decode(input: Buffer): T {
    if (input.length > this.maxSize) {
      throw new Error('input buffer exceeds maxSize');
    }

    this._buffer = input;
    const result = this.value;

    this.reset();

    return result;
  }

  encode(input: T): Buffer {
    this.value = input;

    const result = this.buffer;

    this.reset();

    return result;
  }

  reset(): void {
    this._buffer = undefined;
  }
}

export class DynamicBuffer extends DynamicStructMember<Buffer> {
  get value(): Buffer {
    const result = Buffer.alloc(this.buffer.length);
    this.buffer.copy(result);

    return result;
  }

  set value(input: Buffer) {
    const result = Buffer.alloc(input.length);
    input.copy(result);

    this.buffer = result;
  }
}

export class DynamicString extends DynamicStructMember<string> {
  private readonly _encoding: StringEncodings | DynamicStringEncodings;

  constructor(
    encoding: StringEncodings | DynamicStringEncodings = 'ascii',
    maxSize?: number
  ) {
    super(maxSize);

    this._encoding = encoding;
  }

  get value(): string {
    return this.buffer.toString(this._encoding);
  }

  set value(input: string) {
    const result = Buffer.from(input, this._encoding);
    this.buffer = result;
  }
}

export class BufferWrappedStructMember<T extends TStructMember> {
  private _buffer: Buffer;

  constructor(public readonly member: T) {
    this.member = member;
    this.reset();
  }

  get buffer(): Buffer {
    return this._buffer;
  }

  reset(): void {
    this._buffer = this.member.allocate();
  }
}

export type TDynamicStructMember<T = unknown> =
  | TStructMember<T>
  | DynamicStructMember<T>
  | DynamicStruct<DynamicStructMembers>
  | MappedDynamicStruct<Record<string, TDynamicStructMember>>;

export type WrappedDynamicStructMember<T = unknown> =
  | BufferWrappedStructMember<TStructMember<T>>
  | DynamicStructMember<T>
  | DynamicStruct<DynamicStructMembers>
  | MappedDynamicStruct<Record<string, TDynamicStructMember>>;

export type DynamicStructMembers = TDynamicStructMember[];
export type DynamicStructMemberStore = WrappedDynamicStructMember[];
export type DynamicStructMemberValues<T extends DynamicStructMembers> = {
  [P in keyof T]: T[P] extends FixedBuffer ? undefined : T[P]['value'];
};

export type MappedDynamicStructMembers = Record<string, TDynamicStructMember>;
export type MappedDynamicStructMemberStore = Record<
  string,
  WrappedDynamicStructMember
>;
export type MappedDynamicStructMemberValues<
  T extends MappedDynamicStructMembers
> = {
  [P in keyof T as T[P] extends FixedBuffer ? never : P]: T[P]['value'];
};

const isStaticStructMember = (
  input: TDynamicStructMember
): input is TStructMember => {
  if (
    input instanceof StructMember ||
    input instanceof Struct ||
    input instanceof MappedStruct
  ) {
    return true;
  }

  return false;
};

const isWrappedStaticStructMember = <T>(
  input: WrappedDynamicStructMember<T>
): input is BufferWrappedStructMember<TStructMember<T>> =>
  input instanceof BufferWrappedStructMember;

export class DynamicStruct<T extends DynamicStructMembers> {
  private readonly _members: DynamicStructMemberStore;

  constructor(...members: T) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this._members = members.map((member) => {
      if (isStaticStructMember(member)) {
        return new BufferWrappedStructMember(member);
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return member;
    });
  }

  get buffer(): Buffer {
    return Buffer.concat(this._members.map((member) => member.buffer));
  }

  get value(): DynamicStructMemberValues<T> {
    return this._members.map((member) =>
      isWrappedStaticStructMember(member) ? member.member.value : member.value
    ) as DynamicStructMemberValues<T>;
  }

  set value(input: DynamicStructMemberValues<T>) {
    input.forEach((memberInput, index) => {
      const member = this._members[index];

      if (isWrappedStaticStructMember(member)) {
        member.member.value = memberInput;
        return;
      }

      member.value = memberInput;
    });
  }

  encode(input: DynamicStructMemberValues<T>): Buffer {
    this.value = input;
    const result = this.buffer;

    this.reset();

    return result;
  }

  reset(): void {
    for (const member of this._members) {
      member.reset();
    }
  }
}

export class MappedDynamicStruct<T extends MappedDynamicStructMembers> {
  private readonly _members: MappedDynamicStructMemberStore;

  constructor(members: T) {
    this._members = Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Object.entries(members).map(([property, member]) => {
        if (isStaticStructMember(member)) {
          return [property, new BufferWrappedStructMember(member)];
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return [property, member];
      })
    );
  }

  get buffer(): Buffer {
    return Buffer.concat(
      Object.values(this._members).map(
        (member: WrappedDynamicStructMember) => member.buffer
      )
    );
  }

  get value(): MappedDynamicStructMemberValues<T> {
    return Object.fromEntries(
      Object.entries(this._members).map(([property, member]) =>
        isWrappedStaticStructMember(member)
          ? ([property, member.member.value] as const)
          : [property, member.value]
      )
    ) as MappedDynamicStructMemberValues<T>;
  }

  set value(input: MappedDynamicStructMemberValues<T>) {
    Object.entries(input).forEach(([property, memberInput]) => {
      const member = this._members[property];

      if (isWrappedStaticStructMember(member)) {
        member.member.value = memberInput;
        return;
      }

      member.value = memberInput;
    });
  }

  encode(input: MappedDynamicStructMemberValues<T>): Buffer {
    this.value = input;
    const result = this.buffer;

    this.reset();

    return result;
  }

  reset(): void {
    for (const member of Object.values(this._members)) {
      member.reset();
    }
  }
}

export type TDynamicStruct<
  T extends
    | DynamicStruct<DynamicStructMembers>
    | MappedDynamicStruct<MappedDynamicStructMembers>
> = T['value'];
