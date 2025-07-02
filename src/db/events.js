import * as cbor from "../cbor.js";
import * as stages from "./stages.js";

export class Iou {
  static _cborTag = 121;
  /**
   * @param {bigint} amount
   * @param {Buffer | Uint8Array} signature
   */
  constructor(amount, signature) {
    this.amount = amount;
    this.signature = signature;
  }

  toCBOR() {
    // @ts-ignore
    return [this.constructor._cborTag, [this.amount, this.signature]];
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
   * @param {[bigint | number, Uint8Array<ArrayBufferLike>]} c
   */
  static fromCborContents(c) {
    return new this(BigInt(c[0]), Buffer.from(c[1]));
  }
}

export class Mod {
  static _cborTag = 122;
  /**
   * @param {bigint} by
   */
  constructor(by) {
    this.by = by;
  }

  toCBOR() {
    // @ts-ignore
    return [this.constructor._cborTag, [this.by]];
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
   * @param {[bigint | number]} c
   */
  static fromCborContents(c) {
    return new this(BigInt(c[0]));
  }
}

export class L1 {
  static _cborTag = 123;
  /**
   * @param {import("./types.d.ts").L1Subbit[]} l1Subbits
   */
  constructor(l1Subbits) {
    this.l1Subbits = l1Subbits;
  }

  toCBOR() {
    return [
      // @ts-ignore
      this.constructor._cborTag,
      this.l1Subbits.map((l) => [l.txId, l.outputIdx, l.sub, l.subbitAmt]),
    ];
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
   * @param {[Uint8Array<ArrayBufferLike>, bigint | number, bigint | number, bigint | number][]} cs
   */
  static fromCborContents(cs) {
    return new this(
      cs.map((c) => ({
        txId: Buffer.from(c[0]),
        outputIdx: BigInt(c[1]),
        sub: BigInt(c[2]),
        subbitAmt: BigInt(c[3]),
      })),
    );
  }
}

export class Edit {
  static _cborTag = 124;
  /**
   * @param {"Mod" | "Suspend" | "Unsuspend"} kind
   * @param {bigint} [by]
   */
  constructor(kind, by = 0n) {
    this.kind = kind;
    this.by = by;
  }

  toCBOR() {
    // @ts-ignore
    return [this.constructor._cborTag, [this.kind, this.by]];
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
   * @param {[string, bigint]} c
   */
  static fromCborContents(c) {
    // @ts-ignore
    return new this(c[0], BigInt(c[1]));
  }
}

/**
 * @typedef Event
 * @type {Iou | Mod | L1 | Edit }
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
  if (tag == Mod._cborTag) return Mod.fromCborContents(contents);
  if (tag == L1._cborTag) return L1.fromCborContents(contents);
  if (tag == Edit._cborTag) return Edit.fromCborContents(contents);
  throw new Error(`Unknown tag : ${tag}`);
}
