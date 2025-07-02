export const encode = (
  /** @type {Buffer | Uint8Array<ArrayBufferLike>} */ b,
) => {
  const e = Buffer.from(b).toString("base64url");
  return e.padEnd(Math.ceil(e.length / 4) * 4, "=");
};
export const decode = (/** @type {string} */ s) => Buffer.from(s, "base64url");
