import * as assert from "node:assert";
import { test } from "node:test";
import * as cred from "./index.js";
import * as msg from "./msg.js";
import * as cbor from "../cbor.js";

/**
 * @type {Array<[Buffer, Buffer, bigint]>} iou
 */
const testInputs = [
  [Buffer.from("0".repeat(64), "hex"), Buffer.from([]), 0n],
  [Buffer.from("0".repeat(64), "hex"), Buffer.from([]), 1n],
  [Buffer.from("0".repeat(64), "hex"), Buffer.from([]), -1n],
  [
    Buffer.from("0".repeat(64), "hex"),
    Buffer.from("0".repeat(100), "hex"),
    2n ** 32n - 1n,
  ],
  [
    Buffer.from("0".repeat(64), "hex"),
    Buffer.from("1".repeat(100), "hex"),
    2n ** 32n,
  ],
  [
    Buffer.from("0".repeat(64), "hex"),
    Buffer.from("2".repeat(100), "hex"),
    2n ** 32n + 1n,
  ],
  [
    Buffer.from("0".repeat(64), "hex"),
    Buffer.from("3".repeat(100), "hex"),
    -(2n ** 32n + 1n),
  ],
  [
    Buffer.from("0".repeat(64), "hex"),
    Buffer.from("4".repeat(100), "hex"),
    -(2n ** 32n),
  ],
  [
    Buffer.from("0".repeat(64), "hex"),
    Buffer.from("5".repeat(100), "hex"),
    -(2n ** 32n - 1n),
  ],
  [
    Buffer.from("0".repeat(64), "hex"),
    Buffer.from("0".repeat(100), "hex"),
    2n ** 64n - 1n,
  ],
  [
    Buffer.from("0".repeat(64), "hex"),
    Buffer.from("1".repeat(100), "hex"),
    2n ** 64n,
  ],
  [
    Buffer.from("0".repeat(64), "hex"),
    Buffer.from("2".repeat(100), "hex"),
    2n ** 64n + 1n,
  ],
  [
    Buffer.from("0".repeat(64), "hex"),
    Buffer.from("3".repeat(100), "hex"),
    -(2n ** 64n + 1n),
  ],
  [
    Buffer.from("0".repeat(64), "hex"),
    Buffer.from("4".repeat(100), "hex"),
    -(2n ** 64n),
  ],
  [
    Buffer.from("0".repeat(64), "hex"),
    Buffer.from("5".repeat(100), "hex"),
    -(2n ** 64n - 1n),
  ],
];

test("roundtrip cred", (t) => {
  testInputs.forEach(([skey, tag, num]) => {
    const x = cred.Cred.mk(skey, new msg.Iou(tag, num));
    assert.deepEqual(x, cred.Cred.fromCbor(cbor.encode(x)));
  });
  testInputs.forEach(([skey, tag, num]) => {
    const x = cred.Cred.mk(skey, new msg.Stamp(tag, num));
    assert.deepEqual(x, cred.Cred.fromCbor(cbor.encode(x)));
  });
  testInputs.forEach(([skey, tag, num]) => {
    const x = cred.Cred.mk(skey, new msg.Fixed(tag, num));
    assert.deepEqual(x, cred.Cred.fromCbor(cbor.encode(x)));
  });
});
