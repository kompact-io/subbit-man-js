import * as cbor from "../cbor.js";
import * as ed25519 from "../ed25519.js";
import * as msg from "./msg.js";
import * as b64 from "../base64.js";

export class Cred {
  /**
   * @param {Buffer | Uint8Array} iouKey
   * @param {msg.Msg} message
   * @param {Buffer | Uint8Array} signature
   */
  constructor(iouKey, message, signature) {
    this.iouKey = Buffer.from(iouKey);
    this.message = message;
    this.signature = Buffer.from(signature);
  }

  keytag() {
    return Buffer.from([...this.iouKey, ...this.message.tag]);
  }

  msgCbor() {
    return cbor.encode(this.message);
  }

  /**
   * @param {import("../ed25519.js").Hex} skey
   * @param {msg.Msg} message
   */
  static mk(skey, message) {
    return new this(
      ed25519.verificationKey(skey),
      message,
      ed25519.sign(cbor.encode(message), skey),
    );
  }

  toCBOR() {
    return [this.iouKey, this.message, this.signature];
  }

  toCbor() {
    return cbor.encode(this.toCBOR());
  }

  /**
   * @param {Uint8Array<ArrayBufferLike> | Buffer<ArrayBuffer>} raw
   */
  static fromCbor(raw) {
    const d = cbor.decode(raw);
    // @ts-ignore
    return new this(d[0], msg.fromCborDecoded(d[1]), d[2]);
  }

  toB64() {
    return b64.encode(this.toCbor());
  }

  /**
   * @param {string} raw
   */
  static fromB64(raw) {
    return this.fromCbor(b64.decode(raw));
  }

  check() {
    return ed25519.verify(this.signature, this.msgCbor(), this.iouKey);
  }

  /**
   * @param {string} raw
   */
  static checkB64(raw) {
    const x = this.fromB64(raw);
    if (!x.check()) throw new Error("check failed");
    return x;
  }

  /**
   * @param {string} raw
   */
  static tryB64(raw) {
    const x = this.fromB64(raw);
    if (!x.check()) return;
    return x;
  }
}
