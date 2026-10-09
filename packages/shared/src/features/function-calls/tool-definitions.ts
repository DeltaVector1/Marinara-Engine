// ──────────────────────────────────────────────
// Function Calling / Tool Use Types
// ──────────────────────────────────────────────

export { BUILT_IN_TOOLS } from "./tool-registry.generated.js";

/** JSON Schema subset for tool parameter definitions. */
export interface ToolParameterSchema {
  type: "object" | "string" | "number" | "integer" | "boolean" | "array";
  description?: string;
  properties?: Record<string, ToolParameterProperty>;
  required?: string[];
  anyOf?: Array<{ required: string[] }>;
  additionalProperties?: boolean;
  items?: ToolParameterProperty;
}

interface ToolParameterProperty {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  description?: string;
  enum?: string[];
  items?: ToolParameterProperty;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
}

/** Definition of a tool/function that an agent can call. */
export interface ToolDefinition {
  /** Unique tool name (e.g. "get_weather", "roll_dice") */
  name: string;
  /** Human-readable description */
  description: string;
  /** JSON Schema for the parameters */
  parameters: ToolParameterSchema;
}

/** Extended AgentConfig with tool definitions. */
export interface AgentToolConfig {
  /** Tools this agent can use */
  tools: ToolDefinition[];
  /** How many tool calls are allowed per turn (0 = unlimited) */
  maxCallsPerTurn: number;
  /** Whether to allow parallel tool calls */
  parallelCalls: boolean;
}
