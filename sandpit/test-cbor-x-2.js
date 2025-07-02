import { encode, decode } from "cbor-x";

function roundtrip(x) {
  return decode(Buffer.from(x, "hex"));
  return encode(decode(Buffer.from(x, "hex")))
    .toString("hex")
    .toLowerCase();
}

function main() {
  const ls = [
    "0f",
    "18ff",
    "19ffff",
    "1affffffff",
    "1bffffffffffffffff",
    "21",
    "2f",
    "38ff",
    "39ffff",
    "3a7fffffff",
    "3affffffff",
    "3bffffffffffffffff",
  ];
  console.log(ls.map(roundtrip));
}

main();
