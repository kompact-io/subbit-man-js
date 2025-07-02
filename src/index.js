import sensible from "@fastify/sensible";
import { defaults } from "./options.js";
import db from "./db/index.js";
import routes from "./routes.js";
import * as config from "./config.js";

const options = {
  dbPath: "./db",
  provider: defaults.provider,
  currency: "Ada",
  closePeriod: String(60 * 60 * 1000),
  tagLength: "20",
  nowThreshold: String(60 * 60 * 1000),
  fixedSeed: defaults.fixedSeed,
  initCost: "1000",
  bodyLimit: 1048576 * 30,
};

/**
 * @import { FastifyInstance, FastifyPluginOptions} from "fastify";
 * @param {FastifyInstance} fastify
 * @param {FastifyPluginOptions & import("./config.js").Options} opts
 */

function main(fastify, opts) {
  const c = config.parseOptions({ ...opts, ...config.env() });
  fastify.register(sensible);
  fastify.register(db, { config: c.db });
  fastify.register(routes, { config: c.routes });
}

export { options };
export default main;
