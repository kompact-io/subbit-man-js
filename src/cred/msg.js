import * as cbor from "../cbor.js";

export class Iou {
  static _cborTag = 121;
  /**
   * @param {Buffer} tag
   * @param {bigint} amount
   */
  constructor(tag, amount) {
    this.tag = tag;
    this.amount = amount;
  }

  /**
   * @param {{ write: (arg0: Buffer<ArrayBuffer>) => void; } } writer
   */
  toCBOR(writer) {
    // @ts-ignore
    const _cborTag = this.constructor._cborTag;
    writer.write(
      Buffer.from([
        0xd8,
        0x79,
        0x9f,
        ...cbor.encode(this.tag),
        ...cbor.encode(this.amount),
        0xff,
      ]),
    );
  }

  toCbor() {
    return cbor.encode(this);
  }

  /**
   * @param {Uint8Array<ArrayBufferLike>} raw
   */
  static fromCbor(raw) {
    // @ts-ignore
    const { tag, contents } = cbor.decode(raw);
    if (tag != this._cborTag) throw `wrong tag ${tag}`;
    return this.fromCborContents(contents);
  }

  /**
   * @param {[Uint8Array<ArrayBufferLike>, bigint | number]} c
   */
  static fromCborContents(c) {
    return new this(Buffer.from(c[0]), BigInt(c[1]));
  }
}

export class Stamp {
  static _cborTag = 122;
  /**
   * @param {Buffer} tag
   * @param {bigint} now
   */
  constructor(tag, now) {
    this.tag = tag;
    this.now = now;
  }

  toCBOR() {
    // @ts-ignore
    return [this.constructor._cborTag, [this.tag, this.now]];
  }

  toCbor() {
    return cbor.encode(this.toCBOR());
  }

  /**
   * @param {Uint8Array<ArrayBufferLike>} raw
   */
  static fromCbor(raw) {
    // @ts-ignore
    const { tag, contents } = cbor.decode(raw);
    if (tag != this._cborTag) throw `wrong tag ${tag}`;
    return this.fromCborContents(contents);
  }

  /**
   * @param {[Uint8Array<ArrayBufferLike>, bigint | number]} c
   */
  static fromCborContents(c) {
    return new this(Buffer.from(c[0]), BigInt(c[1]));
  }
}

export class Fixed {
  static _cborTag = 123;
  /**
   * @param {Buffer} tag
   * @param {bigint} seed
   */
  constructor(tag, seed) {
    this.tag = tag;
    this.seed = seed;
  }

  toCBOR() {
    // @ts-ignore
    return [this.constructor._cborTag, [this.tag, this.seed]];
  }

  toCbor() {
    return cbor.encode(this.toCBOR());
  }

  /**
   * @param {Uint8Array<ArrayBufferLike>} raw
   */
  static fromCbor(raw) {
    // @ts-ignore
    const { tag, contents } = cbor.decode(raw);
    if (tag != this._cborTag) throw `wrong tag ${tag}`;
    return this.fromCborContents(contents);
  }

  /**
   * @param {[Uint8Array<ArrayBufferLike>, bigint | number]} c
   */
  static fromCborContents(c) {
    return new this(Buffer.from(c[0]), BigInt(c[1]));
  }
}

/**
 * @typedef Msg
 * @type {Iou | Stamp | Fixed}
 * */

/**
 * @param {Uint8Array<ArrayBufferLike>} raw
 */
export function fromCbor(raw) {
  // @ts-ignore
  return fromCborDecoded(cbor.decode(raw));
}

/**
 * @param {{ tag : number, contents : any }} arg0
 */
export function fromCborDecoded({ tag, contents }) {
  if (tag == Iou._cborTag) return Iou.fromCborContents(contents);
  if (tag == Stamp._cborTag) return Stamp.fromCborContents(contents);
  if (tag == Fixed._cborTag) return Fixed.fromCborContents(contents);
  throw new Error(`Unknown tag : ${tag}`);
}

/**
 * @template T
 * @param {T[]} l
 */
function* gen(l) {
  for (const x of l) {
    yield x;
  }
}
