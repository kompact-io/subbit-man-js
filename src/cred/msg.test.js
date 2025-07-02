import * as assert from "node:assert";
import { test } from "node:test";
import * as msg from "./msg.js";
import * as cbor from "../cbor.js";

/**
 * @param {msg.Iou} iou
 */
function roundtrip(iou) {
  return msg.Iou.fromCbor(cbor.encode(iou));
}

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

test("roundtrip iou", (t) => {
  testInputs.forEach(([tag, amount]) => {
    const x = new msg.Iou(tag, amount);
    console.log("iou", Buffer.from(x.toCbor()).toString("hex"));
    assert.deepEqual(x, msg.Iou.fromCbor(cbor.encode(x)));
    assert.deepEqual(x, msg.fromCbor(cbor.encode(x)));
  });
});

test("roundtrip stamp", (t) => {
  testInputs.forEach(([tag, amount]) => {
    const x = new msg.Stamp(tag, amount);
    assert.deepEqual(x, msg.Stamp.fromCbor(cbor.encode(x)));
    assert.deepEqual(x, msg.fromCbor(cbor.encode(x)));
  });
});

test("roundtrip fixed", (t) => {
  testInputs.forEach(([tag, amount]) => {
    const x = new msg.Fixed(tag, amount);
    assert.deepEqual(x, msg.Fixed.fromCbor(cbor.encode(x)));
    assert.deepEqual(x, msg.fromCbor(cbor.encode(x)));
  });
});
