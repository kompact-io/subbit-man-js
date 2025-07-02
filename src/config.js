import { defaults } from "./options.js";
/**
 * @typedef Config
 * @type {object}
 * @property {import("./db/config.js").Config} db
 * @property {import("./routes.js").Config} routes
 * --@property {import("./l2/config.js").Config} l2
 * --@property {import("./l1/config.js").Config} l1
 */

const OPTIONS_PREFIX = "SUBBIT_MAN_";

/**
 * Get options from env.
 * Used to overrides options.
 * */
export function env() {
  return Object.fromEntries(
    Object.keys(process.env)
      .filter((x) => x.startsWith(OPTIONS_PREFIX))
      .map((x) => [
        snakeToCamel(x.slice(OPTIONS_PREFIX.length)),
        process.env[x],
      ]),
  );
}

/**
 * @typedef Options
 * @type {object}
 * @property {string} dbPath
 * @property {string} provider - Provider vkh, hex encoded
 * @property {string} currency
 * @property {string} closePeriod
 * @property {string} tagLength
 * @property {string} nowThreshold
 * @property {string} fixedSeed
 * @property {string} initCost
 * */

/**
 * @param {Options} opts
 * @returns {Config}
 */

export function parseOptions(opts) {
  opts = opts;
  const dbPath = opts.dbPath;
  const provider = Buffer.from(opts.provider, "hex");
  if (provider.equals(Buffer.from(defaults.provider, "hex"))) {
    console.warn(`Provider key set to default value`);
  }
  const currency = parseCurrency(opts.currency);
  const closePeriod = BigInt(opts.closePeriod);
  const tagLength = parseNotNaN(opts.tagLength);
  const nowThreshold = opts.nowThreshold ? BigInt(opts.nowThreshold) : 0n;
  const fixedSeed = opts.fixedSeed ? BigInt(opts.fixedSeed) : 0n;
  if (opts.fixedSeed && opts.fixedSeed == defaults.fixedSeed) {
    console.warn(`Fixed seed set to default value`);
  }

  const initCost = BigInt(opts.initCost);
  return {
    // l2: {
    //   nowThreshold,
    //   fixedSeed,
    // },
    routes: {
      provider,
      currency,
      closePeriod,
      tagLength,
      nowThreshold,
      fixedSeed,
    },
    db: {
      dbPath,
      initCost,
    },
  };
}

/**
 * @param {string} str
 * */
const snakeToCamel = (str) =>
  str
    .toLowerCase()
    .replace(/([-_][a-z])/g, (group) =>
      group.toUpperCase().replace("-", "").replace("_", ""),
    );

/**
 * @param {string} currency
 * @returns {import("./types.ts").Currency}
 */
function parseCurrency(currency) {
  currency = currency.toLowerCase();
  if (currency == "ada") {
    return { kind: "Ada" };
  } else {
    const [label, hex] = currency.split(":")[1];
    if (label == "byhash") {
      return { kind: "ByHash", value: Buffer.from(hex, "hex") };
    } else if (label == "byclass") {
      return { kind: "ByClass", value: Buffer.from(hex, "hex") };
    } else {
      throw new Error(`Cannot parse currency ${currency}`);
    }
  }
}

/**
 * @param {string} s
 * */
function parseScriptHash(s) {
  const x = Buffer.from(s, "hex");
  if (x.length != 28) {
    throw new Error("Expect script hash to be 28 bytes, hex encoded");
  }
  return x;
}

/**
 * @param {string} s
 * */
function parseAssetName(s) {
  const x = Buffer.from(s, "hex");
  if (x.length <= 32) {
    throw new Error("Expect script hash to be 28 bytes, hex encoded");
  }
  return x;
}

/**
 * @param {string} s
 * */
function parseUnit(s) {
  const hash = parseScriptHash(s.slice(0, 56));
  const name = parseAssetName(s.slice(56));
  return { hash, name };
}

/**
 * @param {string} s
 * */
function parseNotNaN(s) {
  const x = Number(s);
  if (isNaN(x)) {
    throw new Error(`Expected not NaN. Got ${s}`);
  }
  return x;
}
