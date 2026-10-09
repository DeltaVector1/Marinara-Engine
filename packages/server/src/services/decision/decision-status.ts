import { DECISION_LOCAL_DEFAULT_SETTINGS_KEY, decisionLocalSlotForId } from "@marinara-engine/shared";
import type { DB } from "../../db/connection.js";
import { createAppSettingsStorage } from "../storage/app-settings.storage.js";
import { createConnectionsStorage } from "../storage/connections.storage.js";

interface DecisionConnectionRowSummary {
  id: string;
  credentialsFromConnectionId?: string | null;
  profileImportReviewRequired?: unknown;
}

/** Shared by selection, the options list and Mari. This is not a network health test. */
export function decisionConnectionUnavailable(
  row: DecisionConnectionRowSummary,
  rows: DecisionConnectionRowSummary[],
): "needs_relinking" | null {
  if (row.profileImportReviewRequired === "true") return "needs_relinking";
  if (!row.credentialsFromConnectionId) return null;
  const lender = rows.find((other) => other.id === row.credentialsFromConnectionId);
  return lender && lender.profileImportReviewRequired !== "true" ? null : "needs_relinking";
}

export async function readSelectedDecisionModel(db: DB): Promise<string | null> {
  const local = await createAppSettingsStorage(db).get(DECISION_LOCAL_DEFAULT_SETTINGS_KEY);
  if (decisionLocalSlotForId(local)) return local;
  return (await createConnectionsStorage(db).getDefaultForDecision())?.id ?? null;
}
