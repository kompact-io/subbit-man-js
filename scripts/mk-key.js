import * as ed from "@noble/ed25519";
import * as hcrypto from "@harmoniclabs/crypto";
import * as key from "../src/ed25519.js";

function parseOrGen(maybeKey) {
  if (maybeKey && typeof maybeKey == "string") {
    if (maybeKey.length == 64) {
      return Buffer.from(maybeKey, "hex");
    } else {
      return key.decodeBech32(maybeKey)[1];
    }
  } else {
    return ed.utils.randomPrivateKey();
  }
}

function main() {
  const args = process.argv;
  const skey = parseOrGen(args[2]);
  const vkey = ed.getPublicKey(skey);
  const vkhHex = hcrypto.blake2b_224(vkey);
  console.log(
    JSON.stringify(
      {
        skeyHex: Buffer.from(skey).toString("hex"),
        skeyBech: hcrypto.encodeBech32("ed25519_sk", skey),
        vkeyHex: Buffer.from(vkey).toString("hex"),
        vkeyBech: hcrypto.encodeBech32("ed25519_vk", vkey),
        vkhHex: Buffer.from(vkhHex).toString("hex"),
      },
      null,
      2,
    ),
  );
}

main();
