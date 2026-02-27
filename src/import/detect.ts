import type { SchemaType } from "../core/types.js";
import { findChildrenField } from "./fields.js";
import { findParentField } from "./fields.js";

const SCHEMA_SAMPLE_SIZE = 5;

/**
 * Detect whether the data uses a nested, flat, or simple schema.
 *
 * - "nested"  — items contain a children array field
 * - "flat"    — items reference a parent via a parent field
 * - "simple"  — plain list, no hierarchy signals
 *
 * Returns null if items is empty or the first item is not an object.
 */
export function detectSchema(
  items: Record<string, unknown>[],
): SchemaType | null {
  if (items.length === 0) return null;

  const checkCount = Math.min(items.length, SCHEMA_SAMPLE_SIZE);
  let sawObject = false;

  // Check for nested in the sampled items.
  for (let i = 0; i < checkCount; i++) {
    const sample = items[i];
    if (typeof sample !== "object" || sample === null) continue;
    sawObject = true;
    if (findChildrenField(sample) !== null) return "nested";
  }

  if (!sawObject) return null;

  // Check for flat in the sampled items.
  for (let i = 0; i < checkCount; i++) {
    const sample = items[i];
    if (typeof sample !== "object" || sample === null) continue;
    if (findParentField(sample) !== null) return "flat";
  }

  return "simple";
}
