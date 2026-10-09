import { z } from "zod";
import { SPATIAL_CONTEXT_LIMITS } from "../utils/spatial-context.js";

const spatialIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(SPATIAL_CONTEXT_LIMITS.maxIdLength)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u, "Use letters, numbers, dots, underscores, colons, or hyphens.");

const spatialTravelModeSchema = z.enum(["step_by_step", "travel_now"]);

export const pendingSpatialTransitionSchema = z
  .object({
    destinationId: spatialIdSchema,
    travelMode: spatialTravelModeSchema.optional(),
    expectedDefinitionRevision: z.number().int().nonnegative().safe(),
    expectedCurrentLocationId: spatialIdSchema.nullable(),
    commandId: z.string().trim().min(1).max(SPATIAL_CONTEXT_LIMITS.maxCommandIdLength),
  })
  .strict();
