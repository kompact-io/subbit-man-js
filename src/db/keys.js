import * as cbor from "../cbor.js";

const NOW_BYTES_LENGTH = 9;

export const pref = {
  state: 0,
  event: 1,
};

export const suff = {
  stage: 0,
  cost: 1,
  iouAmt: 2,
  sub: 3,
  subbitAmt: 4,
  sig: 5,
};

/**
 * @param {Buffer} stateKey - works for any state key
 */
export function decompose(stateKey) {
  return {
    iouKey: stateKey.subarray(1, 33),
    tag: stateKey.subarray(33, stateKey.length - 1),
  };
}

/**
 * @param {Buffer} stateKey - works for any state key
 */
export function state2keytag(stateKey) {
  return stateKey.subarray(1, stateKey.length - 1);
}

/**
 * @param {Buffer} iouKey
 * @param {Buffer} tag
 */
export function keytag(iouKey, tag) {
  return Buffer.from([...iouKey, ...tag]);
}

export function allStateBounds() {
  return { lt: Buffer.from([pref.event]) };
}

/**
 * @param {Buffer} keytag
 */
export function stateBounds(keytag) {
  return { gte: stage(keytag), lte: sig(keytag) };
}

/**
 * @param {keyof suff} kind
 * @param {Buffer} keytag
 */
export function state(kind, keytag) {
  return Buffer.from([pref.state, ...keytag, suff[kind]]);
}

/**
 * @param {keyof suff} kind
 * @param {Buffer} iouKey
 * @param {Buffer} tag
 */
export function stateS(kind, iouKey, tag) {
  return Buffer.from([pref.state, ...iouKey, ...tag, suff[kind]]);
}

/**
 * @param {Buffer} keytag
 */
export function stage(keytag) {
  return Buffer.from([pref.state, ...keytag, suff.stage]);
}

/**
 * @param {Buffer} iouKey
 * @param {Buffer} tag
 */
export function stageS(iouKey, tag) {
  return Buffer.from([pref.state, ...iouKey, ...tag, suff.stage]);
}

/**
 * @param {Buffer} keytag
 */
export function cost(keytag) {
  return Buffer.from([pref.state, ...keytag, suff.cost]);
}

/**
 * @param {Buffer} iouKey
 * @param {Buffer} tag
 */
export function costS(iouKey, tag) {
  return Buffer.from([pref.state, ...iouKey, ...tag, suff.cost]);
}

/**
 * @param {Buffer} keytag
 */
export function iouAmt(keytag) {
  return Buffer.from([pref.state, ...keytag, suff.iouAmt]);
}

/**
 * @param {Buffer} iouKey
 * @param {Buffer} tag
 */
export function iouAmtS(iouKey, tag) {
  return Buffer.from([pref.state, ...iouKey, ...tag, suff.iouAmt]);
}

/**
 * @param {Buffer} keytag
 */
export function sub(keytag) {
  return Buffer.from([pref.state, ...keytag, suff.sub]);
}

/**
 * @param {Buffer} iouKey
 * @param {Buffer} tag
 */
export function subS(iouKey, tag) {
  return Buffer.from([pref.state, ...iouKey, ...tag, suff.sub]);
}

/**
 * @param {Buffer} keytag
 */
export function subbitAmt(keytag) {
  return Buffer.from([pref.state, ...keytag, suff.subbitAmt]);
}

/**
 * @param {Buffer} iouKey
 * @param {Buffer} tag
 */
export function subbitAmtS(iouKey, tag) {
  return Buffer.from([pref.state, ...iouKey, ...tag, suff.subbitAmt]);
}

/**
 * @param {Buffer} keytag
 */
export function sig(keytag) {
  return Buffer.from([pref.state, ...keytag, suff.sig]);
}

/**
 * @param {Buffer} iouKey
 * @param {Buffer} tag
 */
export function sigS(iouKey, tag) {
  return Buffer.from([pref.state, ...iouKey, ...tag, suff.sig]);
}

/**
 * @param {Buffer} c
 */
export function state2iouKey(c) {
  return c.subarray(1, 33);
}

/**
 * @param {Buffer} c
 */
export function state2tag(c) {
  return c.subarray(33, c.length - 1);
}

/**
 * @param {Buffer} keytag
 */
export function event(keytag) {
  const nowBytes = cbor.encode(Date.now());
  if (nowBytes.length != NOW_BYTES_LENGTH)
    throw new Error(`Now must have ${NOW_BYTES_LENGTH}`);
  return Buffer.from([pref.event, ...keytag, ...nowBytes]);
}

/**
 * @param {Buffer} eventKey
 */
export function event2keytag(eventKey) {
  return eventKey.subarray(1, eventKey.length - NOW_BYTES_LENGTH);
}

/**
 * @param {Buffer} keytag
 */
export function stateKeys(keytag) {
  return [
    stage(keytag),
    cost(keytag),
    iouAmt(keytag),
    sub(keytag),
    subbitAmt(keytag),
    sig(keytag),
  ];
}

/**
 * @param {Buffer} iouKey
 * @param {Buffer} tag
 */
export function eventS(iouKey, tag) {
  return Buffer.from([
    pref.event,
    ...iouKey,
    ...tag,
    ...cbor.encode(Date.now()),
  ]);
}

/**
 * @typedef AbIterator
 * @type {import("abstract-leveldown").AbstractIterator<Buffer<ArrayBufferLike>, any>}
 * */
/**
 * @param {AbIterator} i
 */
export async function* keytagIter(i) {
  let cnt = 0;
  const loopLen = Object.entries(suff).length; // 6
  // @ts-ignore
  for await (const [key, _] of i) {
    if (cnt++ % loopLen == 0) {
      yield key.subarray(1, key.length - 1);
    }
  }
}
