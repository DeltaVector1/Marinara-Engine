import { type GmVerb } from "@marinara-engine/shared";

type GmVerbArgValue = string | number | boolean;
type GmVerbArgs = Record<string, GmVerbArgValue>;

/** One tag the GM emitted that named a verb in this chat's table and validated. */
export type GmVerbCall = {
  verb: GmVerb;
  args: GmVerbArgs;
};
