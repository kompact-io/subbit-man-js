import { Buffer } from "node:buffer";
import { registerEncoder } from "cbor2/encoder";
import { encode, decode, Writer } from "cbor2";

/**
 * @typedef Options
 * @type { object }
 * @property { string } [unknown] - fixme when we know what type this is
 *
 * */

registerEncoder(
  Buffer,
  (
    /** @type {{ buffer: any; byteOffset: number | undefined; byteLength: number | undefined; }} */ b,
  ) => [
    // Don't write a tag
    NaN,
    // New view on the ArrayBuffer, without copying bytes
    new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  ],
);

export { encode, decode, Writer };
