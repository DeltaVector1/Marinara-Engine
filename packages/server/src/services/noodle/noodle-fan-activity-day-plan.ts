const NOODLE_FAN_ACTIVITY_DAY_PLAN_VERSION = 1 as const;
const NOODLE_FAN_ACTIVITY_MAX_RUNS_PER_DAY = 24 as const;
const NOODLE_FAN_ACTIVITY_MAX_MANUAL_RUNS = 24 as const;
const NOODLE_FAN_ACTIVITY_MAX_CREATORS_PER_RUN = 12 as const;
export const NOODLE_FAN_ACTIVITY_MAX_ACTIVITIES_PER_CREATOR = 4 as const;

type NoodleFanActivityRunStatus =
  "scheduled" | "generating" | "applying" | "completed" | "skipped" | "abandoned";

interface NoodleFanAcceptedActivity {
  id: string;
  creatorId: string;
  type: string;
  targetPostId: string;
  content: string | null;
  actorId: string;
  snapshot: NoodleAuthorSnapshot;
  applied: boolean;
}

interface NoodleFanActivityDayPlanRun {
  id: string;
  scheduledAt: string;
  creatorIds: string[];
  status: NoodleFanActivityRunStatus;
  acceptedActivities: NoodleFanAcceptedActivity[];
  claimedAt: string | null;
  finishedAt: string | null;
  manual?: boolean;
}

interface PersistedNoodleFanActivityDayPlan {
  version: typeof NOODLE_FAN_ACTIVITY_DAY_PLAN_VERSION;
  localDate: string;
  timezone: string;
  runs: NoodleFanActivityDayPlanRun[];
  nextCreatorOffset: number;
}


function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isStatus(value: unknown): value is NoodleFanActivityRunStatus {
  return (
    value === "scheduled" ||
    value === "generating" ||
    value === "applying" ||
    value === "completed" ||
    value === "skipped" ||
    value === "abandoned"
  );
}




function validActivity(value: unknown): value is NoodleFanAcceptedActivity {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.creatorId === "string" &&
    typeof row.type === "string" &&
    typeof row.targetPostId === "string" &&
    typeof row.actorId === "string" &&
    (row.content === null || typeof row.content === "string") &&
    typeof row.applied === "boolean" &&
    "snapshot" in row
  );
}

function validRun(value: unknown): value is NoodleFanActivityDayPlanRun {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    isTimestamp(row.scheduledAt) &&
    Array.isArray(row.creatorIds) &&
    row.creatorIds.length <= NOODLE_FAN_ACTIVITY_MAX_CREATORS_PER_RUN &&
    new Set(row.creatorIds).size === row.creatorIds.length &&
    row.creatorIds.every((id) => typeof id === "string") &&
    isStatus(row.status) &&
    Array.isArray(row.acceptedActivities) &&
    row.acceptedActivities.every(validActivity) &&
    (row.claimedAt === null || isTimestamp(row.claimedAt)) &&
    (row.finishedAt === null || isTimestamp(row.finishedAt))
  );
}

export function parsePersistedNoodleFanActivityDayPlan(value: unknown): PersistedNoodleFanActivityDayPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.version !== NOODLE_FAN_ACTIVITY_DAY_PLAN_VERSION) return null;
  if (typeof row.localDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(row.localDate)) return null;
  if (typeof row.timezone !== "string" || !row.timezone || !Array.isArray(row.runs)) return null;
  const validRuns = row.runs.every(validRun);
  const manualRunCount = validRuns
    ? row.runs.filter((run) => (run as NoodleFanActivityDayPlanRun).manual === true).length
    : 0;
  const automaticRunCount = validRuns ? row.runs.length - manualRunCount : 0;
  if (
    row.runs.length < 1 ||
    !validRuns ||
    automaticRunCount > NOODLE_FAN_ACTIVITY_MAX_RUNS_PER_DAY ||
    manualRunCount > NOODLE_FAN_ACTIVITY_MAX_MANUAL_RUNS
  ) {
    return null;
  }
  if (
    typeof row.nextCreatorOffset !== "number" ||
    !Number.isInteger(row.nextCreatorOffset) ||
    row.nextCreatorOffset < 0
  ) {
    return null;
  }
  return {
    version: NOODLE_FAN_ACTIVITY_DAY_PLAN_VERSION,
    localDate: row.localDate,
    timezone: row.timezone,
    runs: row.runs,
    nextCreatorOffset: row.nextCreatorOffset,
  };
}


import type { NoodleAuthorSnapshot } from "@marinara-engine/shared";
