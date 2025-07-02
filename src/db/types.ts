import { Stage } from "./stages.js";

export { Either } from "../types.ts";
export { Edit } from "../schemaTypes.ts";

export type TotFail = "NoSubbit" | "Suspended" | "Other";

export type Info = {
  iouKey: Buffer;
  tag: Buffer;
  stage: Stage;
  cost: bigint;
  iouAmt: bigint;
  sub: bigint;
  subbitAmt: bigint;
  sig: Buffer;
};

export type InfoFail = "NoSubbit" | "Other";

export type TagIou = {
  iouKey: Buffer;
  tag: Buffer;
  iouAmt: bigint;
  sig: Buffer;
};
export type Ious = Record<
  string,
  { iouAmt: string; sig: string; txId?: string; outputIdx?: string }
>;
export type IousFail = "Other";

export type IouFail = "NoSubbit" | "InsufficientAmount" | "Suspended" | "Other";
export type ModFail = "NoSubbit" | "Suspended" | "Other";
export type L1Fail = "Other";
export type EditFail = "NoSubbit" | "UnknownEdit" | "Other";

export type L1Action =
  | "NoneSuspended"
  | "NoneOpened"
  | "Insert"
  | "Update"
  | "Suspend";
export type L1Report = { keytag: Buffer; action: L1Action };

export type DropSubbitFail = "NoSubbit" | "Opened" | "Other";
export type DropEventsFail = "Other";

export type Stages = Record<string, Stage>;

export type L1Subbit = {
  txId: Uint8Array<ArrayBufferLike> | Buffer;
  outputIdx: bigint;
  sub: bigint;
  subbitAmt: bigint;
};
