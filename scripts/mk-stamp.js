import * as cred from "../src/cred/index.js";
import * as msg from "../src/cred/msg.js";

function main() {
  const args = process.argv;
  const now = BigInt(args[2] || Date.now());
  const tag = Buffer.from(args[3] || "deadbeef", "hex");
  const iouKeySkey = Buffer.from(args[4] || "0".repeat(64), "hex");
  const m = new msg.Stamp(tag, now);
  const c = cred.Cred.mk(iouKeySkey, m);
  console.log(c.toB64());
}

main();
