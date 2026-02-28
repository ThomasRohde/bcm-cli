/**
 * Field-detection heuristics. Each finder checks well-known candidate names
 * against the keys of a JSON object, with a fallback strategy when no
 * candidate matches.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasKey(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function firstMatchingKey(
  obj: Record<string, unknown>,
  candidates: string[],
): string | null {
  for (const c of candidates) {
    if (hasKey(obj, c)) return c;
  }
  return null;
}

function isArrayOfObjects(value: unknown, allowEmpty: boolean): boolean {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return allowEmpty;
  return value.every((item) => typeof item === "object" && item !== null);
}

// ---------------------------------------------------------------------------
// Name field
// ---------------------------------------------------------------------------

export const NAME_CANDIDATES = [
  "name",
  "title",
  "label",
  "capability",
  "capabilityName",
  "capability_name",
];

/**
 * Detect the field that holds the capability name.
 * Falls back to the first string-valued field if no candidate matches.
 */
export function findNameField(
  obj: Record<string, unknown>,
  override?: string,
): string | null {
  if (override) return override;

  const match = firstMatchingKey(obj, NAME_CANDIDATES);
  if (match) return match;

  // Fallback: first field whose value is a string
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "string") return key;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Description field
// ---------------------------------------------------------------------------

export const DESC_CANDIDATES = [
  "description",
  "desc",
  "documentation",
  "doc",
  "summary",
  "details",
  "text",
];

/**
 * Detect the field that holds the capability description.
 */
export function findDescField(
  obj: Record<string, unknown>,
  override?: string,
): string | null {
  if (override) return override;
  return firstMatchingKey(obj, DESC_CANDIDATES);
}

// ---------------------------------------------------------------------------
// Children field
// ---------------------------------------------------------------------------

export const CHILDREN_CANDIDATES = [
  "children",
  "subCapabilities",
  "sub_capabilities",
  "subcapabilities",
  "capabilities",
  "items",
  "nodes",
  "subs",
  "sub",
];

/**
 * Detect the field that holds an array of child capabilities.
 * Falls back to the first field whose value is an array of objects.
 */
export function findChildrenField(
  obj: Record<string, unknown>,
  override?: string,
): string | null {
  if (override) return override;
  for (const candidate of CHILDREN_CANDIDATES) {
    if (hasKey(obj, candidate) && isArrayOfObjects(obj[candidate], true)) {
      return candidate;
    }
  }

  // Fallback: first field whose value is an array of objects
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (isArrayOfObjects(val, false)) {
      return key;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Parent field
// ---------------------------------------------------------------------------

export const PARENT_CANDIDATES = [
  "parent",
  "parentName",
  "parent_name",
  "parentId",
  "parent_id",
  "parentCapability",
  "parent_capability",
];

/**
 * Detect the field that holds a reference to the parent capability.
 */
export function findParentField(
  obj: Record<string, unknown>,
  override?: string,
): string | null {
  if (override) return override;
  return firstMatchingKey(obj, PARENT_CANDIDATES);
}

// ---------------------------------------------------------------------------
// ID field
// ---------------------------------------------------------------------------

export const ID_CANDIDATES = ["id", "ID", "key", "code", "identifier"];

/**
 * Detect the field that holds a unique identifier for the capability.
 */
export function findIdField(
  obj: Record<string, unknown>,
  override?: string,
): string | null {
  if (override) return override;
  return firstMatchingKey(obj, ID_CANDIDATES);
}

// ---------------------------------------------------------------------------
// Level field
// ---------------------------------------------------------------------------

export const LEVEL_CANDIDATES = [
  "level",
  "Level",
  "L",
  "depth",
  "tier",
  "hierarchy_level",
  "hierarchyLevel",
];

/**
 * Detect the field that holds a hierarchy level indicator (e.g., L1/L2/L3 or 1/2/3).
 */
export function findLevelField(
  obj: Record<string, unknown>,
  override?: string,
): string | null {
  if (override) return override;
  return firstMatchingKey(obj, LEVEL_CANDIDATES);
}
