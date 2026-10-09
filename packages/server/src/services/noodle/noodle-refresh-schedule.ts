import type { NoodleRefreshSchedulerStatus } from "@marinara-engine/shared";

const NOODLE_REFRESH_SCHEDULE_VERSION = 1 as const;

export interface PersistedNoodleRefreshSchedule {
  version: typeof NOODLE_REFRESH_SCHEDULE_VERSION;
  scheduleDate: string;
  timezone: string;
  refreshesPerDay: number;
  scheduledTimes: string[];
  completedTimes: string[];
  successfulRefreshes: number;
  failureAttempts: number;
  nextAttemptAt: string | null;
  lastAutomaticRefreshAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
}

type RandomSource = () => number;

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function nullableIsoTimestamp(value: unknown): string | null {
  return isIsoTimestamp(value) ? value : null;
}

function integerInRange(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : null;
}

function normalizedRandom(random: RandomSource): number {
  const value = random();
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(0.999_999, Math.max(0, value));
}

function localScheduleDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localScheduleTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
}

function generateNoodleRefreshTimes(date: Date, refreshesPerDay: number, random: RandomSource = Math.random): string[] {
  const count = Math.max(0, Math.min(24, Math.floor(refreshesPerDay)));
  if (count === 0) return [];

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
  const windowSize = (dayEnd - dayStart) / count;

  return Array.from({ length: count }, (_, index) => {
    const windowStart = dayStart + windowSize * index;
    // Keep each refresh away from the exact window boundaries. This still feels
    // organic while preventing adjacent slots from clustering around one instant.
    const positionWithinWindow = 0.15 + normalizedRandom(random) * 0.7;
    return new Date(windowStart + windowSize * positionWithinWindow).toISOString();
  });
}

export function parsePersistedNoodleRefreshSchedule(value: unknown): PersistedNoodleRefreshSchedule | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== NOODLE_REFRESH_SCHEDULE_VERSION) return null;
  if (typeof record.scheduleDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(record.scheduleDate)) return null;
  if (typeof record.timezone !== "string" || !record.timezone) return null;
  const refreshesPerDay = integerInRange(record.refreshesPerDay, 0, 24);
  const successfulRefreshes = integerInRange(record.successfulRefreshes, 0, 24);
  const failureAttempts = integerInRange(record.failureAttempts, 0, 10_000);
  if (refreshesPerDay === null || successfulRefreshes === null || failureAttempts === null) return null;
  if (!Array.isArray(record.scheduledTimes) || !record.scheduledTimes.every(isIsoTimestamp)) return null;
  if (!Array.isArray(record.completedTimes) || !record.completedTimes.every(isIsoTimestamp)) return null;

  const scheduledTimes = Array.from(new Set(record.scheduledTimes)).sort();
  const scheduledSet = new Set(scheduledTimes);
  const completedTimes = Array.from(new Set(record.completedTimes))
    .filter((time) => scheduledSet.has(time))
    .sort();
  if (scheduledTimes.length !== refreshesPerDay) return null;

  return {
    version: NOODLE_REFRESH_SCHEDULE_VERSION,
    scheduleDate: record.scheduleDate,
    timezone: record.timezone,
    refreshesPerDay,
    scheduledTimes,
    completedTimes,
    successfulRefreshes: Math.min(successfulRefreshes, completedTimes.length),
    failureAttempts,
    nextAttemptAt: nullableIsoTimestamp(record.nextAttemptAt),
    lastAutomaticRefreshAt: nullableIsoTimestamp(record.lastAutomaticRefreshAt),
    lastAttemptAt: nullableIsoTimestamp(record.lastAttemptAt),
    lastError: typeof record.lastError === "string" && record.lastError ? record.lastError.slice(0, 500) : null,
  };
}

export function reconcileNoodleRefreshSchedule(
  current: PersistedNoodleRefreshSchedule | null,
  refreshesPerDay: number,
  at: Date,
  random: RandomSource = Math.random,
): PersistedNoodleRefreshSchedule {
  const count = Math.max(0, Math.min(24, Math.floor(refreshesPerDay)));
  const scheduleDate = localScheduleDate(at);
  const timezone = localScheduleTimezone();
  if (
    current &&
    current.scheduleDate === scheduleDate &&
    current.timezone === timezone &&
    current.refreshesPerDay === count &&
    current.scheduledTimes.length === count
  ) {
    return current;
  }

  const sameLocalDay = current?.scheduleDate === scheduleDate && current.timezone === timezone;
  const scheduledTimes = generateNoodleRefreshTimes(at, count, random);
  const preservedCompletedCount = sameLocalDay ? Math.min(current?.completedTimes.length ?? 0, count) : 0;
  return {
    version: NOODLE_REFRESH_SCHEDULE_VERSION,
    scheduleDate,
    timezone,
    refreshesPerDay: count,
    scheduledTimes,
    completedTimes: scheduledTimes.slice(0, preservedCompletedCount),
    successfulRefreshes: sameLocalDay ? Math.min(current?.successfulRefreshes ?? 0, preservedCompletedCount) : 0,
    failureAttempts: 0,
    nextAttemptAt: null,
    lastAutomaticRefreshAt: current?.lastAutomaticRefreshAt ?? null,
    lastAttemptAt: sameLocalDay ? (current?.lastAttemptAt ?? null) : null,
    lastError: null,
  };
}

function dueNoodleRefreshTimes(schedule: PersistedNoodleRefreshSchedule, at: Date): string[] {
  const completed = new Set(schedule.completedTimes);
  const now = at.getTime();
  return schedule.scheduledTimes.filter((time) => !completed.has(time) && Date.parse(time) <= now);
}

function nextNoodleRefreshTime(schedule: PersistedNoodleRefreshSchedule): string | null {
  const completed = new Set(schedule.completedTimes);
  return schedule.scheduledTimes.find((time) => !completed.has(time)) ?? null;
}

export function clearNoodleRefreshFailure(schedule: PersistedNoodleRefreshSchedule): PersistedNoodleRefreshSchedule {
  return {
    ...schedule,
    failureAttempts: 0,
    nextAttemptAt: null,
    lastError: null,
  };
}

export function noodleRefreshSchedulerStatus(
  schedule: PersistedNoodleRefreshSchedule,
  at: Date,
): NoodleRefreshSchedulerStatus {
  const nextRefreshAt = nextNoodleRefreshTime(schedule);
  const retryAt = schedule.nextAttemptAt ? Date.parse(schedule.nextAttemptAt) : null;
  const due = dueNoodleRefreshTimes(schedule, at).length > 0;
  const state: NoodleRefreshSchedulerStatus["state"] =
    schedule.refreshesPerDay === 0
      ? "disabled"
      : schedule.lastError && retryAt !== null && retryAt > at.getTime()
        ? "retrying"
        : due
          ? "due"
          : nextRefreshAt
            ? "scheduled"
            : "completed";
  return {
    state,
    scheduleDate: schedule.scheduleDate,
    timezone: schedule.timezone,
    refreshesPerDay: schedule.refreshesPerDay,
    scheduledTimes: schedule.scheduledTimes,
    completedTimes: schedule.completedTimes,
    completedSlots: schedule.completedTimes.length,
    successfulRefreshes: schedule.successfulRefreshes,
    skippedSlots: Math.max(0, schedule.completedTimes.length - schedule.successfulRefreshes),
    nextRefreshAt,
    nextAttemptAt: schedule.nextAttemptAt,
    lastAutomaticRefreshAt: schedule.lastAutomaticRefreshAt,
    lastAttemptAt: schedule.lastAttemptAt,
    lastError: schedule.lastError,
  };
}
