import * as cbor from "../cbor.js";
import * as stages from "./stages.js";
import * as keys from "./keys.js";
import * as events from "./events.js";

/**
 * @import {Either} from "../types.d.ts"
 * @import {Info, InfoFail, TotFail} from "./types.ts"
 * */

/**
 * @param {Buffer<ArrayBufferLike>} base
 * @param {(arg0: Buffer<ArrayBufferLike>) => Buffer<ArrayBufferLike>} keyFn
 * @param {Buffer<ArrayBufferLike> | Uint8Array} buf
 * @returns {{type : "put" , key : Buffer, value : Buffer | Uint8Array}}
 */
export function putBuf(base, keyFn, buf) {
  return {
    type: "put",
    key: keyFn(base),
    value: buf,
  };
}

/**
 * @param {Buffer} base
 * @param {stages.Stage} stage
 */
export function putStage(base, stage) {
  return putBuf(base, keys.stage, cbor.encode(stage));
}

/**
 * @param {Buffer} base
 * @param {bigint} amt
 */
export function putCost(base, amt) {
  return putBuf(base, keys.cost, cbor.encode(amt));
}

/**
 * @param {Buffer} base
 * @param {bigint} amt
 */
export function putIouAmt(base, amt) {
  return putBuf(base, keys.iouAmt, cbor.encode(amt));
}

/**
 * @param {Buffer} base
 * @param {bigint} amt
 */
export function putSub(base, amt) {
  return putBuf(base, keys.sub, cbor.encode(amt));
}

/**
 * @param {Buffer} base
 * @param {bigint} amt
 */
export function putSubbitAmt(base, amt) {
  return putBuf(base, keys.subbitAmt, cbor.encode(amt));
}

/**
 * @param {Buffer} base
 * @param {Buffer} sig
 */
export function putSig(base, sig) {
  return putBuf(base, keys.sig, sig);
}

/**
 * @param {Buffer} base
 * @param {events.Event} ev
 * @returns {{type : "put" , key : Buffer, value : Buffer | Uint8Array}}
 */
export function putEvent(base, ev) {
  return putBuf(base, keys.event, cbor.encode(ev));
}

/**
 * @typedef AbIterator
 * @type {import("abstract-leveldown").AbstractIterator<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>}
 * */

export const amtFromCbor = (/** @type {Uint8Array<ArrayBufferLike>} */ x) =>
  BigInt(cbor.decode(x));

/**
 * @typedef Infox
 * @type {object}
 * @property {Buffer} iouKey
 * @property {Buffer} tag
 * @property {stages.Stage} stage
 * @property {bigint} cost
 * @property {bigint} iouAmt
 * @property {bigint} sub
 * @property {bigint} subbitAmt
 * @property {Buffer} sig
 * */

/**
 * @param {AbIterator} i
 * @returns {Promise<Either<Info, InfoFail>>}
 */
export function getInfo(i) {
  return nextKey6(i).then(
    (res) => {
      if (res.kind == "Right") {
        const [stageKey, stage, cost, iouAmt, sub, subbitAmt, sig] = res.value;
        const { iouKey, tag } = keys.decompose(stageKey);
        return {
          kind: "Right",
          value: {
            iouKey,
            tag,
            stage: stages.fromCbor(stage),
            cost: amtFromCbor(cost),
            iouAmt: amtFromCbor(iouAmt),
            sub: amtFromCbor(sub),
            subbitAmt: amtFromCbor(subbitAmt),
            sig,
          },
        };
      } else {
        return { kind: "Left", error: "NoSubbit" };
      }
    },
    (_) => ({ kind: "Left", error: "Other" }),
  );
}

/**
 * @param {AbIterator} i
 * @returns {Promise<Either<Info, InfoFail>[]>}
 */
export function getAll(i) {
  // TODO :: Check whether calling this recursively is probelmatic
  return getInfo(i).then(
    (a) =>
      a.kind == "Right"
        ? getAll(i).then((r) => [a, ...r])
        : Promise.resolve([]),
    (_) => Promise.resolve([]),
  );
}

/**
 * @param {AbIterator} i
 * @returns {Promise<Either<bigint,TotFail>>}
 */
export function getTot(i) {
  return getInfo(i).then(
    (res) => {
      if (res.kind == "Left") {
        return res;
      } else {
        const { stage, cost, iouAmt, sub, subbitAmt } = res.value;
        if (stages.isSuspended(stage)) {
          return { kind: "Left", error: "Suspended" };
        } else {
          return {
            kind: "Right",
            value: calcTot(cost, iouAmt, sub, subbitAmt),
          };
        }
      }
    },
    (_rej) => ({ kind: "Left", error: "Other" }),
  );
}

/**
 * @param {bigint} cost
 * @param {bigint} iou
 * @param {bigint} sub
 * @param {bigint} subbit
 * @returns{bigint}
 */
export function calcTot(cost, iou, sub, subbit) {
  const max = cost > sub ? cost : sub;
  const x0 = iou - max;
  return x0 < subbit ? x0 : subbit;
}

/**
 * Convert nodestyle callback to promise
 * @param {AbIterator} i
 */

function nextValue(i) {
  return new Promise(function (resolve, reject) {
    i.next(function (err, _key, val) {
      if (err !== null) reject(err);
      else resolve(val);
    });
  });
}

/**
 * Convert nodestyle callback to promise
 * @param {AbIterator} i
 */

function nextKeyValue(i) {
  return new Promise(function (resolve, reject) {
    i.next(function (err, key, value) {
      if (err !== null) reject(err);
      else resolve({ key, value });
    });
  });
}

/**
 * @param {AbIterator} i
 * @returns {Promise<Either<[Buffer,Buffer,Buffer,Buffer,Buffer,Buffer,Buffer], InfoFail> >}
 */
export function nextKey6(i) {
  return nextKeyValue(i).then(
    ({ key, value: i0 }) =>
      nextValue(i).then((i1) =>
        nextValue(i).then((i2) =>
          nextValue(i).then((i3) =>
            nextValue(i).then((i4) =>
              nextValue(i).then((i5) =>
                key != undefined
                  ? {
                      kind: "Right",
                      value: [key, i0, i1, i2, i3, i4, i5],
                    }
                  : { kind: "Left", error: "NoSubbit" },
              ),
            ),
          ),
        ),
      ),
    (_) => ({ kind: "Left", error: "Other" }),
  );
}

/**
 * @param {AbIterator} i
 * @returns {Promise<Buffer[]>}
 */
export async function getOpened(i) {
  const keytags = [];
  // @ts-ignore: According to the docs, this is legit. https://github.com/Level/leveldown?tab=readme-ov-file#for-awaitof-iterator
  for await (const [key, value] of i) {
    if (key[key.length - 1] == keys.suff.stage) {
      const stage = stages.fromCbor(value);
      if (!stages.isSuspended(stage)) {
        keytags.push(keys.state2keytag(key));
      }
    }
  }
  return keytags;
}
