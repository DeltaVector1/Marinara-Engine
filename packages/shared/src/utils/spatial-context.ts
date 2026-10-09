export const SPATIAL_CONTEXT_LIMITS = {
  maxLocations: 5_000,
  maxDepth: 20,
  maxLinksPerLocation: 50,
  maxNameLength: 200,
  maxDescriptionLength: 4_000,
  maxAwarenessSummaryLength: 1_000,
  maxModelMemoryLength: 8_000,
  maxIdLength: 128,
  maxLinkLabelLength: 200,
  maxCommandIdLength: 200,
  maxPromptDestinations: 50,
  maxLorebookEntryIdsPerLocation: 50,
  /** Maximum number of destination IDs returned for one routed transition. */
  maxRouteLocations: 64,
} as const;
