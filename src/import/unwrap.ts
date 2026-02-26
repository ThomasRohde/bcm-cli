import type { BcmWarning } from "../core/types.js";
import { BcmAppError, ErrorCode } from "../cli/errors.js";
import { findNameField, findChildrenField } from "./fields.js";

/**
 * Unwrap raw parsed JSON into an array of record objects suitable for
 * schema detection and normalization.
 *
 * Handles several shapes:
 * - Top-level array
 * - Single root node (has name + children)
 * - Wrapper object (has children but no name — unwrap children)
 * - Single capability (has name but no children)
 * - Object with an array property (unwrap first array)
 * - Explicit property override via `explicitProperty`
 */
export function unwrapData(
  data: unknown,
  explicitProperty?: string,
): { items: Record<string, unknown>[]; warnings: BcmWarning[] } {
  const warnings: BcmWarning[] = [];

  // ------------------------------------------------------------------
  // Explicit property override
  // ------------------------------------------------------------------
  if (explicitProperty) {
    if (
      typeof data !== "object" ||
      data === null ||
      Array.isArray(data)
    ) {
      throw new BcmAppError(
        ErrorCode.ERR_VALIDATION_EMPTY_INPUT,
        `Cannot unwrap property "${explicitProperty}" from non-object data`,
      );
    }

    const obj = data as Record<string, unknown>;
    const value = obj[explicitProperty];

    if (value === undefined) {
      throw new BcmAppError(
        ErrorCode.ERR_VALIDATION_EMPTY_INPUT,
        `Property "${explicitProperty}" not found in data`,
        { availableKeys: Object.keys(obj) },
      );
    }

    if (Array.isArray(value)) {
      return { items: value as Record<string, unknown>[], warnings };
    }

    if (typeof value === "object" && value !== null) {
      return { items: [value as Record<string, unknown>], warnings };
    }

    throw new BcmAppError(
      ErrorCode.ERR_VALIDATION_EMPTY_INPUT,
      `Property "${explicitProperty}" is not an array or object`,
    );
  }

  // ------------------------------------------------------------------
  // Top-level array
  // ------------------------------------------------------------------
  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new BcmAppError(
        ErrorCode.ERR_VALIDATION_EMPTY_INPUT,
        "Input array is empty",
      );
    }
    return { items: data as Record<string, unknown>[], warnings };
  }

  // ------------------------------------------------------------------
  // Top-level object
  // ------------------------------------------------------------------
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    const nameField = findNameField(obj);
    const childrenField = findChildrenField(obj);

    // Single root node (has both name and children)
    if (nameField !== null && childrenField !== null) {
      return { items: [obj], warnings };
    }

    // Wrapper object (has children array but no name)
    if (childrenField !== null && nameField === null) {
      const children = obj[childrenField];
      if (Array.isArray(children) && children.length > 0) {
        warnings.push({
          code: "WARN_UNWRAP_WRAPPER",
          message: `Data appears to be a wrapper object; unwrapping "${childrenField}" property`,
          details: { unwrappedField: childrenField },
        });
        return { items: children as Record<string, unknown>[], warnings };
      }
    }

    // Single capability (has name but no children)
    if (nameField !== null && childrenField === null) {
      return { items: [obj], warnings };
    }

    // Fallback: find first array property containing objects
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (
        Array.isArray(val) &&
        val.length > 0 &&
        typeof val[0] === "object" &&
        val[0] !== null
      ) {
        warnings.push({
          code: "WARN_UNWRAP_GUESSED",
          message: `No obvious structure detected; unwrapping first array property "${key}"`,
          details: { unwrappedField: key },
        });
        return { items: val as Record<string, unknown>[], warnings };
      }
    }
  }

  // ------------------------------------------------------------------
  // Nothing worked
  // ------------------------------------------------------------------
  throw new BcmAppError(
    ErrorCode.ERR_VALIDATION_EMPTY_INPUT,
    "Could not find capability data in input",
  );
}
