import _ from "lodash";
import * as cbor from "../cbor.js";

const { invert } = _;

export const stageIdx = { Opened: 0, Suspended: 1n };
export const idxStage = invert(stageIdx);

export const reasonIdx = { Edit: 0n, Closed: 1n };
export const idxReason = invert(reasonIdx);

export class Opened {
  static _cborTag = 121;
  /**
   * @param {Buffer} txId
   * @param {bigint} outputIdx
   */
  constructor(txId, outputIdx) {
    this.txId = txId;
    this.outputIdx = outputIdx;
  }

  toCBOR() {
    // @ts-ignore
    return [this.constructor._cborTag, [this.txId, this.outputIdx]];
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
  toString() {
    return "Opened";
  }
}

export class Suspended {
  static _cborTag = 122;
  /**
   * @param {bigint} timestamp
   * @param {keyof reasonIdx} reason
   */
  constructor(timestamp, reason) {
    this.timestamp = timestamp;
    this.reason = reason;
  }

  toCBOR() {
    return [
      // @ts-ignore
      this.constructor._cborTag,
      [this.timestamp, reasonIdx[this.reason]],
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
   * @param {[bigint | number, number]} c
   */
  static fromCborContents(c) {
    // @ts-ignore
    return new this(BigInt(c[0]), idxReason[c[1]]);
  }

  toString() {
    return "Suspended";
  }
}

/**
 * @typedef Stage
 * @type {Opened | Suspended }
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
  if (tag == Opened._cborTag) return Opened.fromCborContents(contents);
  if (tag == Suspended._cborTag) return Suspended.fromCborContents(contents);
  throw new Error(`Unknown tag : ${tag}`);
}

/**
 * @param {Stage} stage
 */
export function isSuspended(stage) {
  // @ts-ignore
  return stage.constructor._cborTag == Suspended._cborTag;
}
