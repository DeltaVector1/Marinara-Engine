// ──────────────────────────────────────────────
// Noodle Fake Social Media Types
// ──────────────────────────────────────────────
import type { AvatarCrop } from "./avatar-crop.js";

export type NoodleAccountKind = "persona" | "character" | "random_user";
/**
 * Which simulated platform an account lives on. This is content separation
 * between two fictional products, NOT a privacy or security control — see
 * `NoodlePostAccess` for the actual paywall/visibility concept.
 */
export type NoodlePlatform = "noodle" | "noodler";
export type NoodleInteractionType = "like" | "repost" | "reply" | "vote";
export type NoodlePostSource = "manual" | "generated";
/** The real privacy concept: who may read a NoodleR post. Deliberately keeps the word "public". */
export type NoodlePostAccess = "public" | "locked";
type NoodleTheme = "system" | "light" | "dark";
export type NoodleCarryoverMode = "off" | "conversation" | "roleplay" | "game" | "all";
export type NoodleCarryoverTarget = "conversation" | "roleplay" | "game";
type NoodleParticipantSelectionMode = "all" | "random_range" | "exact";
type NoodleIdentityDisclosure = "open" | "hinted" | "secret";
type NoodlerOnboardingState = "incomplete" | "zero" | "completed";
type NoodlerFanArchetype =
  "ordinary" | "eccentric" | "crossFandom" | "raider" | "organicDiscovery" | "freeResource";

export interface NoodlerSourceSnapshot {
  publicDisplayName: string;
  publicHandle: string;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  appearance: string;
  backstory: string;
}

type NoodlerSourceField = keyof NoodlerSourceSnapshot;

export type NoodlerSourceStatus =
  | { state: "current" }
  | { state: "missing" }
  | {
      state: "changed";
      changes: Array<{ field: NoodlerSourceField; previous: string; current: string }>;
    };

interface NoodleAccountAccessSettings {
  hiddenFromAccountIds: string[];
}

interface NoodleWalletSettings {
  coins: number;
}

interface NoodleAccountProfileSettings {
  avatarCrop?: AvatarCrop | null;
  bannerUrl?: string;
  location?: string;
  profileGenerated?: boolean;
  profileManuallyEdited?: boolean;
  noodlerWizardExecutionId?: string;
  /** Server-owned source state used to detect changes after a Creator profile is drafted. */
  noodlerSourceSnapshot?: NoodlerSourceSnapshot;
}

interface NoodleAccountSocialSettings {
  followingAccountIds?: string[];
  followingAccountTimestamps?: Record<string, string>;
  notificationsReadAt?: string;
  /**
   * When this viewer persona last had the NoodleR feed shown to it, for the
   * "new since your last visit" divider and entry-point counter. Per viewer persona rather
   * than per user: NoodleR follows and locked-post access are persona-scoped, so an
   * account-wide timestamp would let one persona silently clear another's.
   */
  noodlerFeedSeenAt?: string;
  /** The same, for the public Noodle timeline. Separate field: one value would let a visit to
   * either surface clear the other's counter. */
  noodleFeedSeenAt?: string;
}

interface NoodleAutoPostingSettings {
  enabled: boolean;
  /** NoodleR-owned image enablement; independent of public Noodle's enableImagePrompts. */
  imagesEnabled: boolean;
}

type NoodlerFanArchetypeWeights = Record<NoodlerFanArchetype, number>;

interface NoodlerFanActivitySettings {
  enabled?: boolean;
  archetypeWeights?: Partial<NoodlerFanArchetypeWeights>;
}

export interface NoodleAccountSchedulerSettings {
  autoPosting?: NoodleAutoPostingSettings;
  fanActivity?: NoodlerFanActivitySettings;
}

interface NoodleAccountPrivacySettings {
  identityDisclosure?: NoodleIdentityDisclosure;
  stagePersonality?: string;
  access: NoodleAccountAccessSettings;
}

export interface NoodleAccountSettings {
  profile: NoodleAccountProfileSettings;
  social: NoodleAccountSocialSettings;
  scheduler: NoodleAccountSchedulerSettings;
  privacy: NoodleAccountPrivacySettings;
  wallet: NoodleWalletSettings;
}

interface NoodlePollOption {
  id: string;
  label: string;
}

export interface NoodlePoll {
  question: string;
  options: NoodlePollOption[];
}

export interface NoodleSettings {
  refreshesPerDay: number;
  participantSelectionMode: NoodleParticipantSelectionMode;
  participantMin: number;
  participantMax: number;
  maxGeneratedPostsPerRefresh: number;
  maxRepliesPerRefresh: number;
  maxRepostsPerRefresh: number;
  maxLikesPerRefresh: number;
  maxImagesPerRefresh: number;
  enableImagePrompts: boolean;
  imageGenerationConnectionId: string | null;
  imageGenerationPrompt: string;
  imageGenerationUseAvatarReferences: boolean;
  imageGenerationIncludeDescriptions: boolean;
  allowGalleryImageAttachments: boolean;
  imageCaptioningEnabled: boolean;
  imageCaptioningConnectionId: string | null;
  imageCaptioningUseConnectionDefault: boolean;
  enableLorebookContext: boolean;
  includeCharacterSchedules: boolean;
  enableEnhancedTimelineWriting: boolean;
  allowProfessorMari: boolean;
  allowRandomUsers: boolean;
  invitedCharacterGroupIds: string[];
  carryoverMode: NoodleCarryoverMode;
  carryoverModes: NoodleCarryoverTarget[];
  carryoverHours: number;
  carryoverMaxItems: number;
  theme: NoodleTheme;
  generationConnectionId: string | null;
  enableNoodler: boolean;
  /** Editable creative guidance injected into every NoodleR post generation. */
  noodlerGenerationGuidance: string;
  /** Master switch for automatic posting; pauses the scheduler without disabling NoodleR. */
  autoPostingScheduleEnabled: boolean;
  /** Rolling text-attempt ceiling and target maximum publication density. */
  postsPerDay: number;
  /** Durable first-run completion flag shared by every client. */
  noodlerOnboardingComplete: boolean;
  /** Explicit durable first-run sentinel, including an intentional zero-creator completion. */
  noodlerOnboardingState: NoodlerOnboardingState;
  /** Avoid overnight automatic posts for creators without a character schedule. */
  noodlerNightQuiet: boolean;
  /** Optional synthetic audience activity. Kept separate from creator auto-post scheduling. */
  fanActivityEnabled: boolean;
  fanActivityRunsPerDay: number;
  fanLikesPerRefresh: number;
  fanRepliesPerRefresh: number;
  fanRepostsPerRefresh: number;
  fanArchetypeWeights: NoodlerFanArchetypeWeights;
}

interface NoodlerReserveCreatorStatus {
  accountId: string;
  nextPreparedAt: string | null;
}

export interface NoodlerReserveStatus {
  preparedCount: number;
  preparedThrough: string | null;
  textAttemptsUsed: number;
  imageAttemptsUsed: number;
  postsPerDay: number;
  preparationNotBefore: string;
  creators: NoodlerReserveCreatorStatus[];
}

export interface NoodleAccount {
  id: string;
  kind: NoodleAccountKind;
  entityId: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  avatarCrop: AvatarCrop | null;
  invited: boolean;
  settings: NoodleAccountSettings;
  platform: NoodlePlatform;
  noodleAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NoodlerStageProfile {
  id: string;
  noodleAccountId: string | null;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  avatarCrop: AvatarCrop | null;
  disclosureMode: NoodleIdentityDisclosure | null;
  stagePersonality: string;
  publicIdentity: { displayName: string; handle: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoodlerManagedStageProfile extends NoodlerStageProfile {
  access: NoodleAccountAccessSettings;
  autoPosting: NoodleAutoPostingSettings;
  sourceStatus: NoodlerSourceStatus;
  fanActivity: NoodlerFanActivitySettings | null;
}

export interface NoodleAuthorSnapshot {
  id: string;
  kind: NoodleAccountKind;
  entityId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  avatarCrop: AvatarCrop | null;
}

export interface NoodlePost {
  id: string;
  authorAccountId: string;
  content: string;
  imageUrl: string | null;
  imagePrompt: string | null;
  parentPostId: string | null;
  quotePostId: string | null;
  source: NoodlePostSource;
  access: NoodlePostAccess;
  metadata: Record<string, unknown>;
  authorSnapshot: NoodleAuthorSnapshot | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoodlerManagedPost extends NoodlePost {
  title: string | null;
}

export interface NoodleAccountSubscription {
  id: string;
  viewerAccountId: string;
  creatorAccountId: string;
  createdAt: string;
}

export interface NoodlePostUnlock {
  id: string;
  viewerAccountId: string;
  postId: string;
  createdAt: string;
}



export interface NoodleInteraction {
  id: string;
  postId: string;
  parentInteractionId: string | null;
  actorAccountId: string;
  type: NoodleInteractionType;
  content: string | null;
  imageUrl: string | null;
  actorSnapshot: NoodleAuthorSnapshot | null;
  createdAt: string;
}

export interface NoodleDigestEntry {
  id: string;
  accountIds: string[];
  content: string;
  sourceRunId: string | null;
  sourcePostId: string | null;
  sourceInteractionId: string | null;
  createdAt: string;
}

type NoodleRefreshAttemptKind = "initial" | "text_only_fallback" | "correction";

export interface NoodleRefreshAttempt {
  sequence: number;
  kind: NoodleRefreshAttemptKind;
  response: string;
  rejectionReason: string | null;
  createdAt: string;
}

export interface NoodleRefreshRun {
  id: string;
  status: "running" | "completed" | "failed";
  activeAccountIds: string[];
  prompt: string;
  result: string | null;
  error: string | null;
  attempts: NoodleRefreshAttempt[];
  createdAt: string;
  updatedAt: string;
}

type NoodleRefreshSchedulerState = "disabled" | "scheduled" | "due" | "retrying" | "completed";

export interface NoodleRefreshSchedulerStatus {
  state: NoodleRefreshSchedulerState;
  scheduleDate: string;
  timezone: string;
  refreshesPerDay: number;
  scheduledTimes: string[];
  completedTimes: string[];
  completedSlots: number;
  successfulRefreshes: number;
  skippedSlots: number;
  nextRefreshAt: string | null;
  nextAttemptAt: string | null;
  lastAutomaticRefreshAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
}

export interface NoodleBootstrap {
  settings: NoodleSettings;
  scheduler: NoodleRefreshSchedulerStatus;
  accounts: NoodleAccount[];
  posts: NoodlePost[];
  interactions: NoodleInteraction[];
  digests: NoodleDigestEntry[];
}
