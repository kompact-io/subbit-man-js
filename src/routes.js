import { default as schemas } from "../schemas.json" with { type: "json" };
import * as keys from "./db/keys.js";
/** @import * as types from "./schemaTypes.ts" */
/** @import { Currency, Either } from "./types.ts" */
/** @import * as dbTypes from "./db/types.ts" */

import * as cred from "./cred/index.js";

/**
 * @typedef Config
 * @type {object}
 * @property {Buffer} provider
 * @property {Currency} currency
 * @property {bigint} closePeriod
 * @property {number} tagLength
 * @property {bigint} nowThreshold
 * @property {bigint} fixedSeed
 */

/**
 * @import { FastifyInstance } from "fastify";
 * @param {FastifyInstance} fastify
 * @param {{ config : Config }} opts
 */

async function routes(fastify, { config }) {
  fastify.addSchema(schemas);

  /**
   * @param {types.Currency} c
   * @returns {boolean}
   */
  function isCurrency(c) {
    if (config.currency.kind == "Ada") {
      return c == "Ada";
    } else if (config.currency.kind == "ByHash") {
      return (
        typeof c == "object" &&
        "byHash" in c &&
        config.currency.value.equals(Buffer.from(c.byHash, "hex"))
      );
    } else {
      return (
        typeof c == "object" &&
        "byClass" in c &&
        config.currency.value.equals(Buffer.from(c.byClass, "hex"))
      );
    }
  }

  /**
   * If cred is invalid, returns undefined.
   * @param {types.L1Subbit} s
   * @returns {boolean}
   */
  function isL1(s) {
    return (
      config.provider.equals(Buffer.from(s.provider, "hex")) &&
      isCurrency(s.currency) &&
      BigInt(s.closePeriod) >= config.closePeriod &&
      Buffer.from(s.tag, "hex").length <= config.tagLength
    );
  }

  /**
   * If cred is invalid, returns undefined.
   * @param {types.L1Subbit} s
   * @returns {[string, dbTypes.L1Subbit]}
   */
  function parseL1(s) {
    return [
      keys
        .keytag(Buffer.from(s.iouKey, "hex"), Buffer.from(s.tag, "hex"))
        .toString("hex"),
      {
        txId: Buffer.from(s.txId, "hex"),
        outputIdx: BigInt(s.outputIdx),
        subbitAmt: BigInt(s.subbitAmt),
        sub: BigInt(s.sub),
      },
    ];
  }

  /**
   * If cred is invalid, returns undefined.
   * @param {Record<string, dbTypes.L1Subbit[]>} acc
   * @param {types.L1Subbit} curr
   * @returns {Record<string, dbTypes.L1Subbit[]>}
   */
  function groupByKeytag(acc, curr) {
    const [keytag, dbl1] = parseL1(curr);
    (acc[keytag] || (acc[keytag] = [])).push(dbl1);
    return acc;
  }

  /**
   * If cred is invalid, returns undefined.
   * @param {string} s
   * @returns {Promise<Either<Buffer, string>>} - If right, then returns keytag
   */
  function checkCred(s) {
    /**
     * @function
     * @param {string} err
     * @returns {Promise<Either<Buffer, string>>}
     * */
    const left = (err) => Promise.resolve({ kind: "Left", error: err });

    /**
     * @function
     * @param {Buffer} keytag
     * @returns  {Promise<Either<Buffer, string>>}
     * */
    const right = (keytag) => Promise.resolve({ kind: "Right", value: keytag });
    const cx = cred.Cred.tryB64(s);
    if (cx == undefined) {
      return left("BadEncoding");
    } else if (!cx.check) {
      return left("BadSignature");
    } else if ("amount" in cx.message) {
      return fastify
        .putIou(cx.keytag(), cx.message.amount, cx.signature)
        .then((r) => {
          if (r.kind == "Right") {
            return right(cx.keytag());
          } else {
            return r;
          }
        });
    } else if ("now" in cx.message) {
      if (!config.nowThreshold) {
        return left("NoStampCred");
      } else if (cx.message.now < BigInt(Date.now()) - config.nowThreshold) {
        return left("StampTooOld");
      } else if (cx.message.now > BigInt(Date.now()) + config.nowThreshold) {
        return left("StampTooNew");
      } else {
        return right(cx.keytag());
      }
    } else {
      if (!config.fixedSeed) {
        return left("NoFixedCred");
      } else if (cx.message.seed != config.fixedSeed) {
        return left("BadSeed");
      } else {
        return right(cx.keytag());
      }
    }
  }

  fastify.get(
    "/l2/info",
    {
      schema: {
        querystring: { ...schemas.$defs.totQuery, $defs: schemas.$defs },
        response: {
          // 200: { ...schemas.$defs.totRes, $defs: schemas.$defs },
        },
      },
    },
    function (req, res) {
      const { cred: s } = /** @type {types.TotQuery} */ (req.query);
      return checkCred(s).then((r) => {
        if (r.kind == "Right") {
          return fastify
            .getInfo(r.value)
            .then((r) => {
              if (r.kind == "Right") {
                return info2json(r.value);
              } else {
                res.code(400);
                return r.error;
              }
            })
            .then(JSON.stringify);
        } else {
          res.code(400);
          return r.error;
        }
      });
    },
  );

  fastify.get(
    "/l2/tot",
    {
      schema: {
        querystring: { ...schemas.$defs.totQuery, $defs: schemas.$defs },
        response: {
          200: { ...schemas.$defs.totRes, $defs: schemas.$defs },
        },
      },
    },
    function (req, res) {
      const { cred: s } = /** @type {types.TotQuery} */ (req.query);
      const cx = cred.Cred.tryB64(s);
      return checkCred(s).then((r) => {
        if (r.kind == "Right") {
          return fastify.getTot(r.value).then((r) => {
            if (r.kind == "Right") {
              return r.value.toString();
            } else {
              res.code(500);
              return "Other";
            }
          });
        } else {
          res.code(400);
          return r.error;
        }
      });
    },
  );

  fastify.patch(
    "/l2/mod",
    {
      schema: {
        querystring: { ...schemas.$defs.modQuery, $defs: schemas.$defs },
      },
    },
    function (req, res) {
      const { cred: s, by } = /** @type {types.ModQuery} */ (req.query);
      const cx = cred.Cred.tryB64(s);
      if (cx == undefined) {
        res.code(400);
        return "BadCred";
      }
      return fastify.putMod(cx.keytag(), BigInt(by)).then((r) => {
        if (r.kind == "Right") {
          return fastify.getTot(cx.keytag()).then((r) => {
            if (r.kind == "Right") {
              return r.value.toString();
            } else {
              res.code(500);
              return "BadTot";
            }
          });
        } else {
          res.code(500);
          return "BadMod";
        }
      });
    },
  );

  fastify.post(
    "/l1/sync",
    {
      schema: {
        body: { ...schemas.$defs.syncBody, $defs: schemas.$defs },
      },
    },
    function (req, res) {
      const l1sRaw = /** @type {types.SyncBody} */ (req.body);
      const l1s = l1sRaw.filter(isL1).reduce(groupByKeytag, {});
      return fastify.getOpened().then((opened) => {
        return Promise.all(
          Object.entries({
            ...Object.fromEntries(opened.map((kt) => [kt.toString("hex"), []])),
            ...l1s,
          }).map(([kt, l1s]) =>
            fastify.putL1(Buffer.from(kt, "hex"), l1s).then((r) => {
              if (r.kind == "Right") {
                return [kt, r.value];
              } else {
                return [kt, r.error];
              }
            }),
          ),
        ).then(JSON.stringify, (rej) => {
          console.log(rej);
          res.code(500);
          return "Other";
        });
      });
    },
  );

  fastify.get("/l1/ious", function (req, res) {
    return fastify.getIous();
  });

  fastify.get(
    "/exec/show",
    {
      schema: {},
    },
    function (req, res) {
      return fastify
        .getInfos()
        .then((r) => {
          return r.map((s) => {
            if (s.kind == "Right") {
              return info2json(s.value);
            } else {
              return null;
            }
          });
        })
        .then(JSON.stringify);
    },
  );

  fastify.post(
    "/exec/edit",
    {
      schema: {
        body: { ...schemas.$defs.editBody, $defs: schemas.$defs },
      },
    },
    function (req, res) {
      const edits = /** @type {types.EditBody} */ (req.body);
      return Promise.all(
        Object.entries(edits).map(([keytagHex, edit]) => {
          return fastify
            .putEdit(Buffer.from(keytagHex, "hex"), edit)
            .then((r) => {
              if (r.kind == "Right") {
                return [keytagHex, "Ok"];
              } else {
                return [keytagHex, r.error];
              }
            });
        }),
      ).then(Object.fromEntries);
    },
  );

  fastify.post(
    "/exec/drop",
    {
      schema: {
        body: { ...schemas.$defs.dropBody, $defs: schemas.$defs },
      },
    },
    function (req, res) {
      const _drops = /** @type {types.DropBody} */ (req.body);
      throw new Error("Not yet implemented");
    },
  );
}

/**
 * @param {dbTypes.Info} info
 */
function info2json(info) {
  return {
    keytag: keys.keytag(info.iouKey, info.tag).toString("hex"),
    stage: info.stage.toString(),
    cost: String(info.cost),
    iouAmt: String(info.iouAmt),
    sub: String(info.sub),
    subbitAmt: String(info.subbitAmt),
    sig: info.sig.toString("hex"),
  };
}

export default routes;
