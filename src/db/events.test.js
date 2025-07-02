import * as assert from "node:assert";
import { test } from "node:test";
import { blake2b } from "@noble/hashes/blake2.js";

import * as events from "./events.js";
import * as cbor from "../cbor.js";

/**
 * @type {Array<[Buffer, bigint]>} iou
 */
const testInputs = [
  [Buffer.from([]), 0n],
  [Buffer.from([]), 1n],
  [Buffer.from([]), -1n],
  [Buffer.from("0".repeat(100), "hex"), 2n ** 32n - 1n],
  [Buffer.from("1".repeat(100), "hex"), 2n ** 32n],
  [Buffer.from("2".repeat(100), "hex"), 2n ** 32n + 1n],
  [Buffer.from("3".repeat(100), "hex"), -(2n ** 32n + 1n)],
  [Buffer.from("4".repeat(100), "hex"), -(2n ** 32n)],
  [Buffer.from("5".repeat(100), "hex"), -(2n ** 32n - 1n)],
  [Buffer.from("0".repeat(100), "hex"), 2n ** 64n - 1n],
  [Buffer.from("1".repeat(100), "hex"), 2n ** 64n],
  [Buffer.from("2".repeat(100), "hex"), 2n ** 64n + 1n],
  [Buffer.from("3".repeat(100), "hex"), -(2n ** 64n + 1n)],
  [Buffer.from("4".repeat(100), "hex"), -(2n ** 64n)],
  [Buffer.from("5".repeat(100), "hex"), -(2n ** 64n - 1n)],
];

/**
 * TODO : Make this more interesting
 * @param {bigint} seed
 */
function l1Subbit(seed) {
  return {
    txId: blake2b(Buffer.from(String(seed))),
    outputIdx: BigInt(Number(seed) % 1000),
    sub: seed,
    subbitAmt: seed,
  };
}

test("roundtrip iou", (t) => {
  testInputs.forEach(([sig, amount]) => {
    const x = new events.Iou(amount, sig);
    assert.deepEqual(x, events.Iou.fromCbor(cbor.encode(x)));
    assert.deepEqual(x, events.fromCbor(cbor.encode(x)));
  });
});

test("roundtrip mod", (t) => {
  testInputs.forEach(([tag, amount]) => {
    const x = new events.Mod(amount);
    assert.deepEqual(x, events.Mod.fromCbor(cbor.encode(x)));
    assert.deepEqual(x, events.fromCbor(cbor.encode(x)));
  });
});

test("roundtrip l1", (t) => {
  [...Array(10).keys()].forEach((seed) => {
    const x = new events.L1([l1Subbit(BigInt(seed))]);
    console.log(x);
    assert.deepEqual(x, events.L1.fromCbor(cbor.encode(x)));
    assert.deepEqual(x, events.fromCbor(cbor.encode(x)));
  });
});
