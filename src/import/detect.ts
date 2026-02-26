import type { SchemaType } from "../core/types.js";
import { findChildrenField } from "./fields.js";
import { findParentField } from "./fields.js";

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

  const sample = items[0];
  if (typeof sample !== "object" || sample === null) return null;

  // Check for nested: does the sample have a children-like field?
  if (findChildrenField(sample) !== null) {
    return "nested";
  }

  // Check for flat: do any of the first 5 items have a parent-like field?
  const checkCount = Math.min(items.length, 5);
  for (let i = 0; i < checkCount; i++) {
    if (findParentField(items[i]) !== null) {
      return "flat";
    }
  }

  return "simple";
}
