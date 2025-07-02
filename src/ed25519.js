import * as ed from "@noble/ed25519";
import * as hcrypto from "@harmoniclabs/crypto";

import { sha512 } from "@noble/hashes/sha512";
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

/**
 * @typedef {ed.Hex} Hex
 * */

/**
 * @param {string} b32
 */
export function decodeBech32(b32) {
  // if (!hcrypto.isBech32(b32)) throw new Error("Not bech32");
  const sep = b32.lastIndexOf("1");
  const pref = b32.slice(0, sep);
  const payload = b32.slice(sep + 1);
  let data = hcrypto.decodeBase32Bech32(payload.slice(0, payload.length - 6));
  return [pref, Buffer.from(data)];
}

/**
 * @param {Hex} skey
 */
export function verificationKey(skey) {
  return ed.getPublicKey(skey);
}

/**
 * @param {Buffer | Uint8Array<ArrayBufferLike>} msg
 * @param {Hex} skey
 */
export function sign(msg, skey) {
  return ed.sign(msg, skey);
}

/**
 * Follow the ordering of noble
 * @param {Hex} sig
 * @param {Buffer | Uint8Array<ArrayBufferLike>} msg
 * @param {Hex} vkey
 */
export function verify(sig, msg, vkey) {
  return ed.verify(sig, msg, vkey);
}

export function exampleKey() {
  return decodeBech32(
    "ed25519_sk1kde3jrtvh095utywmx6k6mhe8htp2y4ge85j5yjfvc57aghpvrssfktvqe",
  )[1];
}
