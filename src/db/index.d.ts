import { FastifyPluginCallback } from "fastify";
import {
  Either,
  Stage,
  Stages,
  L1Subbit,
  L1Action,
  TotFail,
  Info,
  InfoFail,
  Ious,
  IousFail,
  IouFail,
  ModFail,
  L1Fail,
  EditFail,
  DropSubbitFail,
  DropEventsFail,
} from "./types.ts";
import { Config } from "./config.js";

declare module "fastify" {
  interface FastifyInstance {
    /**
     * Get
     */
    getTot(keytag: Buffer): Promise<Either<bigint, TotFail>>;
    getInfo(keytag: Buffer): Promise<Either<Info, InfoFail>>;
    getInfos(): Promise<Either<Info, InfoFail>[]>;
    getOpened(): Promise<Buffer[]>;
    getIous(): Promise<Either<Ious, IousFail>>;

    /**
     * Put/events:
     * */
    putIou(
      keytag: Buffer,
      amount: bigint,
      sig: Buffer,
    ): Promise<Either<null, IouFail>>;
    putMod(keytag: Buffer, by: bigint): Promise<Either<null, ModFail>>;
    putL1(
      keytag: Buffer,
      l1Subbits: L1Subbit[],
    ): Promise<Either<L1Action, L1Fail>>;
    putEdit(keytag: Buffer, edit: Edit): Promise<Either<null, EditFail>>;

    /**
     * Delete/drop:
     * */
    dropSubbit(keytag: Buffer): Promise<Either<null, DropSubbitFail>>;
    dropEvents(olderThan: bigint): Promise<Either<null, DropEventsFail>>;
  }
}

type Db = FastifyPluginCallback<db.FastifyDbOptions>;

declare namespace db {
  export interface FastifyDbOptions {
    config: Config;
  }
  export const db: Db;
  export { db as default };
}

declare function db(...params: Parameters<Db>): ReturnType<Db>;
export = db;
