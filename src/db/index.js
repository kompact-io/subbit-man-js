import fastifyPlugin from "fastify-plugin";
import fastifyLeveldb from "@fastify/leveldb";

import * as keys from "./keys.js";
import * as values from "./values.js";
import * as events from "./events.js";
import * as stages from "./stages.js";

/**
 * @import * as t from "./types.ts";
 */

/**
 * @import { FastifyInstance } from "fastify";
 * @import { Config } from "./config.js";
 * @param {FastifyInstance} fastify
 * @param {{ config : Config }} opts
 */

async function Db(fastify, { config }) {
  fastify.register(fastifyLeveldb, {
    name: "db",
    path: config.dbPath,
    options: {
      keyEncoding: "binary",
      valueEncoding: "binary",
    },
  });

  //   /**
  //    * Get
  //    */
  //   getTot(keytag : Buffer) : Promise<Either<bigint, TotFail>>

  fastify.decorate("getTot", function (/** @type {Buffer} */ keytag) {
    return values.getTot(fastify.level.db.iterator(keys.stateBounds(keytag)));
  });

  //   getInfo(keytag : Buffer) : Promise<Either<Info, InfoFail>>

  fastify.decorate("getInfo", function (/** @type {Buffer} */ keytag) {
    return values.getInfo(fastify.level.db.iterator(keys.stateBounds(keytag)));
  });

  fastify.decorate("getInfos", function () {
    return values.getAll(fastify.level.db.iterator(keys.allStateBounds()));
  });

  //   getIous() : Promise<Either<Ious, IousFail>>

  fastify.decorate("getIous", function (/** @type {Buffer} */ keytag) {
    return values
      .getAll(fastify.level.db.iterator(keys.allStateBounds()))
      .then((res) =>
        res.map((infoOrFail) => {
          if (infoOrFail.kind == "Right") {
            const { iouKey, tag, iouAmt, sig, stage } = infoOrFail.value;
            const keytag = keys.keytag(iouKey, tag);
            const iou = { iouAmt: String(iouAmt), sig: sig.toString("hex") };
            if ("txId" in stage) {
              return [
                keytag,
                {
                  ...iou,
                  txId: stage.txId.toString("hex"),
                  outputIdx: String(stage.outputIdx),
                },
              ];
            } else {
              return [keytag, iou];
            }
          } else {
            throw new Error("not yet implemented");
          }
        }),
      )
      .then(Object.fromEntries);
  });

  fastify.decorate("getOpened", function () {
    return values.getOpened(
      fastify.level.db.iterator({ ...keys.allStateBounds() }),
    );
  });

  //   /**
  //    * Put/events:
  //    * */
  //   putIou(keytag : Buffer,  amount : bigint, sig : Buffer) : Promise<Either<null, IouFail>>
  fastify.decorate(
    "putIou",
    /**
     * @param {Buffer<ArrayBufferLike>} keytag,
     * @param {bigint} amount,
     * @param {Buffer<ArrayBufferLike>} signature
     * @returns {Promise<t.Either<null, t.IouFail>>}
     * */
    function (keytag, amount, signature) {
      return values
        .getInfo(fastify.level.db.iterator(keys.stateBounds(keytag)))
        .then(
          /**
           * FIXME :: Without this hint typescript is upset; with it typescript does not check types?!
           * @returns {Promise<t.Either<null, t.IouFail>>}
           * */
          (infoOrFail) => {
            if (infoOrFail.kind == "Right") {
              const { stage, iouAmt: currIouAmt } = infoOrFail.value;
              if (amount <= currIouAmt) {
                return Promise.resolve({
                  kind: "Left",
                  error: "InsufficientAmount",
                });
              } else if (stages.isSuspended(stage)) {
                return Promise.resolve({ kind: "Left", error: "Suspended" });
              } else {
                return fastify.level.db
                  .batch([
                    values.putEvent(keytag, new events.Iou(amount, signature)),
                    values.putIouAmt(keytag, amount),
                    values.putSig(keytag, signature),
                  ])
                  .then(
                    (_) => Promise.resolve({ kind: "Right", value: null }),
                    (err) => {
                      throw new Error(JSON.stringify(err.toString()));
                    },
                  );
              }
            } else {
              return Promise.resolve({ kind: "Left", error: "NoSubbit" });
            }
          },
          () => Promise.resolve({ kind: "Left", error: "Other" }),
        );
    },
  );

  //   putMod(keytag : Buffer, by : bigint ) : Promise<Either<null, ModFail>>
  fastify.decorate(
    "putMod",
    /**
     * @param {Buffer<ArrayBufferLike>} keytag,
     * @param {bigint} by,
     * @returns {Promise<t.Either<null, t.ModFail>>}
     * */
    function (keytag, by) {
      return values
        .getInfo(fastify.level.db.iterator(keys.stateBounds(keytag)))
        .then(
          /**
           * FIXME :: Without this hint typescript is upset; with it typescript does not check types?!
           * @returns {Promise<t.Either<null, t.ModFail>>}
           * */
          (infoOrFail) => {
            if (infoOrFail.kind == "Right") {
              const { stage, cost: currCost } = infoOrFail.value;
              if (stages.isSuspended(stage)) {
                return Promise.resolve({ kind: "Left", error: "Suspended" });
              } else {
                return fastify.level.db
                  .batch([
                    values.putEvent(keytag, new events.Mod(by)),
                    values.putCost(keytag, currCost - by),
                  ])
                  .then(
                    (_) => Promise.resolve({ kind: "Right", value: null }),
                    (err) => {
                      throw new Error(JSON.stringify(err.toString()));
                    },
                  );
              }
            } else {
              return Promise.resolve({ kind: "Left", error: "NoSubbit" });
            }
          },
          () => Promise.resolve({ kind: "Left", error: "Other" }),
        );
    },
  );

  /**
   * @param {Buffer<ArrayBufferLike>} keytag,
   * @param {t.L1Subbit[]} l1Subbits,
   * @returns {Promise<t.Either<t.L1Action, t.L1Fail>>}
   * */
  function insertL1(keytag, l1Subbits) {
    const { txId, outputIdx, sub, subbitAmt } = selectL1Subbit(0n, l1Subbits);
    return fastify.level.db
      .batch([
        values.putEvent(keytag, new events.L1(l1Subbits)),
        values.putStage(
          keytag,
          new stages.Opened(Buffer.from(txId), outputIdx),
        ),
        values.putCost(keytag, config.initCost),
        values.putIouAmt(keytag, 0n),
        values.putSub(keytag, sub),
        values.putSubbitAmt(keytag, subbitAmt),
        values.putSig(keytag, Buffer.from([])),
      ])
      .then(
        (_res) => ({ kind: "Right", value: "Insert" }),
        (_rej) => ({ kind: "Left", error: "Other" }),
      );
  }
  /**
   * @param {Buffer<ArrayBufferLike>} keytag
   * @param {stages.Opened} openedStage
   * @param {bigint} iouAmt
   * @param {t.L1Subbit[]} l1Subbits
   * @returns {Promise<t.Either<t.L1Action, t.L1Fail>>}
   * */
  function update(keytag, openedStage, iouAmt, l1Subbits) {
    const { txId, outputIdx, sub, subbitAmt } = selectL1Subbit(
      iouAmt,
      l1Subbits,
    );
    if (openedStage.txId.equals(txId)) {
      return Promise.resolve({ kind: "Right", value: "NoneOpened" });
    } else {
      return fastify.level.db
        .batch([
          values.putEvent(keytag, new events.L1(l1Subbits)),
          values.putStage(
            keytag,
            new stages.Opened(Buffer.from(txId), outputIdx),
          ),
          values.putSub(keytag, sub),
          values.putSubbitAmt(keytag, subbitAmt),
        ])
        .then(
          (_) => Promise.resolve({ kind: "Right", value: "Update" }),
          (err) => {
            throw new Error(JSON.stringify(err.toString()));
          },
        );
    }
  }

  /**
   * @param {Buffer<ArrayBufferLike>} keytag,
   * @returns {Promise<t.Either<t.L1Action, t.L1Fail>>}
   * */
  function suspend(keytag) {
    return fastify.level.db
      .batch([
        values.putEvent(keytag, new events.L1([])),
        values.putStage(
          keytag,
          new stages.Suspended(BigInt(Date.now()), "Closed"),
        ),
      ])
      .then(
        (_) => Promise.resolve({ kind: "Right", value: "Suspend" }),
        (err) => {
          throw new Error(JSON.stringify(err.toString()));
        },
      );
  }

  //   putL1(keytag : Buffer,  l1Subbits: L1Subbit[]) : Promise<Either<L1Report, L1Fail>>
  fastify.decorate(
    "putL1",
    /**
     * @param {Buffer<ArrayBufferLike>} keytag,
     * @param {t.L1Subbit[]} l1Subbits,
     * @returns {Promise<t.Either<t.L1Action, t.L1Fail>>}
     * */
    function (keytag, l1Subbits) {
      return values
        .getInfo(fastify.level.db.iterator(keys.stateBounds(keytag)))
        .then(
          /**
           * FIXME :: Without this hint typescript is upset; with it typescript does not check types?!
           * @returns {Promise<t.Either<t.L1Action, t.L1Fail>>}
           * */
          (infoOrFail) => {
            if (infoOrFail.kind == "Left" && infoOrFail.error == "NoSubbit") {
              return insertL1(keytag, l1Subbits);
            } else if (infoOrFail.kind == "Left") {
              return Promise.resolve({ kind: "Left", error: "Other" });
            }
            const info = infoOrFail.value;
            const { stage, iouAmt } = info;
            if ("timestamp" in stage) {
              return Promise.resolve({ kind: "Right", value: "NoneSuspended" });
            } else if (l1Subbits.length == 0) {
              return suspend(keytag);
            } else {
              return update(keytag, stage, iouAmt, l1Subbits);
            }
          },
          (_rej) => {
            console.log("rej", _rej);
            return { kind: "Left", error: "Other" };
          },
        );
    },
  );
  //   putEdit(keytag : Buffer,  edit : ) : Promise<Either<null, EditFail>>

  fastify.decorate(
    "putEdit",
    /**
     * @param {Buffer<ArrayBufferLike>} keytag,
     * @param {t.Edit} edit,
     * @returns {Promise<t.Either<null, t.EditFail>>}
     * */
    function (keytag, edit) {
      return fastify.getInfo(keytag).then(
        /**
         * FIXME :: Without this hint typescript is upset; with it typescript does not check types?!
         * @returns {Promise<t.Either<null, t.EditFail>>}
         * */
        (r) => {
          if (r.kind == "Left") {
            // return r
            throw r;
          } else {
            if (edit.kind == "mod") {
              const by = "by" in edit ? BigInt(edit.by) : 0n;
              return fastify.level.db
                .batch([
                  values.putEvent(keytag, new events.Edit("Mod", by)),
                  values.putCost(keytag, r.value.cost + by),
                ])
                .then(
                  (_) => ({ kind: "Right", value: null }),
                  (_) => ({ kind: "Left", error: "Other" }),
                );
            } else if (edit.kind == "suspend") {
              return fastify.level.db
                .batch([
                  values.putEvent(keytag, new events.Edit("Suspend")),
                  values.putStage(
                    keytag,
                    new stages.Suspended(BigInt(Date.now()), "Edit"),
                  ),
                ])
                .then(
                  (_) => ({ kind: "Right", value: null }),
                  (_) => ({ kind: "Left", error: "Other" }),
                );
            } else if (edit.kind == "unsuspened") {
              return fastify.level.db
                .batch([
                  values.putEvent(keytag, new events.Edit("Suspend")),
                  values.putStage(
                    keytag,
                    new stages.Suspended(BigInt(Date.now()), "Edit"),
                  ),
                ])
                .then(
                  (_) => ({ kind: "Right", value: null }),
                  (_) => ({ kind: "Left", error: "Other" }),
                );
            } else {
              return Promise.resolve({ kind: "Left", error: "UnknownEdit" });
            }
          }
        },
      );
    },
  );

  //   /**
  //    * Delete/drop:
  //    * */
  //   dropSubbit(keytag : Buffer) : Promise<Either<null,DropSubbitFail>>
  fastify.decorate(
    "dropSubbit",
    /**
     * @param {Buffer<ArrayBufferLike>} keytag,
     * @returns {Promise<t.Either<null,t.DropSubbitFail>>}
     * */
    function (keytag) {
      return fastify.level.db.get(keys.stage(keytag)).then(
        /**
         * @returns {Promise<t.Either<null,t.DropSubbitFail>>}
         * */
        (res) => {
          const stage = stages.fromCbor(res);
          if ("timestamp" in stage) {
            return fastify.level.db
              .batch(
                keys.stateKeys(keytag).map((key) => ({ type: "del", key })),
              )
              .then(
                (_res) => Promise.resolve({ kind: "Right", value: null }),
                (_rej) => Promise.resolve({ kind: "Left", error: "Other" }),
              );
          } else {
            return Promise.resolve({ kind: "Left", error: "Opened" });
          }
        },
        (_rej) => {
          return Promise.resolve({ kind: "Left", error: "Other" });
        },
      );
    },
  );

  //   dropEvents(olderThan : bigint) : Promise<Either<null, DropEventsFail>>
  fastify.decorate(
    "dropEvents",
    /**
     * @param {bigint} olderThan,
     * */
    function (olderThan) {
      throw new Error("Not yet implemented");
    },
  );
}

/**
 * Returns the subbit with greatest sub-able funds.
 * We use the `calcTot` with `cost = 0`.
 *
 * @param {bigint} iouAmt
 * @param {t.L1Subbit[]} l1Subbits
 * @returns {t.L1Subbit}
 */
function selectL1Subbit(iouAmt, l1Subbits) {
  let curr = l1Subbits.pop();
  if (curr == undefined) throw new Error("Must have at least one entry");
  const tot = (/** @type {bigint} */ sub, /** @type {bigint} */ subbitAmt) =>
    values.calcTot(0n, iouAmt, sub, subbitAmt);
  let currTot = tot(curr.sub, curr.subbitAmt);
  while (l1Subbits.length > 0) {
    const x = l1Subbits.pop();
    if (x == undefined) {
      break;
    } else {
      const t = tot(x.sub, x.subbitAmt);
      if (t > currTot) {
        curr = x;
        currTot = t;
      }
    }
  }
  return curr;
}

export default fastifyPlugin(Db);
