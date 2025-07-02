import * as fs from "node:fs";
import * as cred from "../src/cred/index.js";
import * as msg from "../src/cred/msg.js";

function currency(n) {
  return "Ada";
}

function provider(n) {
  return "76a1592044a6e4f511265bca73a604d90b0529d1df602be30a19a9257660d1f5";
}

function closePeriod(n) {
  return String(60 * 60 * 1000);
}

function iouKey(n) {
  const iouKeySkey = Buffer.from(`${n}`.padEnd(64, "0"), "hex");
  const m = new msg.Iou("", 0n);
  const c = cred.Cred.mk(iouKeySkey, m);
  return c.iouKey.toString("hex");
}

function tag(root, n) {
  return Buffer.from([...root, n]).toString("hex");
}

function txId(n, seed) {
  return Buffer.from(`${n}${seed}`.padEnd(64, "1"), "hex").toString("hex");
}

function outputIdx(n) {
  return n;
}

function sub(n) {
  return n * 100000000;
}

function subbitAmt(n) {
  return n * 10000000;
}

function main() {
  const args = process.argv;
  const filepath = String(args[2], "/tmp/subbit-man-l1s.json");
  const n = Number(args[3] || 50000);
  const root = Buffer.from(args[4] || "deadbeef", "hex");
  const seed = Number(args[5] || Date.now());
  const l1s = [...Array(n).keys()].map((k) => ({
    currency: currency(k),
    provider: String(provider(k)),
    closePeriod: String(closePeriod(k)),
    iouKey: iouKey(k),
    tag: tag(root, k),
    txId: txId(k, seed),
    outputIdx: String(outputIdx(k)),
    sub: String(sub(k)),
    subbitAmt: String(subbitAmt(k)),
  }));
  fs.writeFileSync(filepath, JSON.stringify(l1s, null, 2));
}

main();
