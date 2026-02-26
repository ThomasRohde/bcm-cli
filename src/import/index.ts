import type {
  CapabilityNode,
  SchemaType,
  DetectedFields,
  ModelSummary,
  BcmWarning,
  ImportOptions,
} from "../core/types.js";
import { BcmAppError, ErrorCode } from "../cli/errors.js";
import { parseJson } from "./parser.js";
import { unwrapData } from "./unwrap.js";
import { detectSchema } from "./detect.js";
import {
  findNameField,
  findDescField,
  findChildrenField,
  findParentField,
  findIdField,
} from "./fields.js";
import { normalizeItems } from "./normalize.js";
import { validateTree } from "./validate.js";

// Re-export individual modules for direct access
export { readInput } from "./reader.js";
export { parseJson } from "./parser.js";
export { unwrapData } from "./unwrap.js";
export { detectSchema } from "./detect.js";
export {
  findNameField,
  findDescField,
  findChildrenField,
  findParentField,
  findIdField,
} from "./fields.js";
export { normalizeNode, buildTreeFromFlat, normalizeItems } from "./normalize.js";
export { validateTree } from "./validate.js";

// ---------------------------------------------------------------------------
// Summary helpers
// ---------------------------------------------------------------------------

function countNodes(roots: CapabilityNode[]): number {
  let count = 0;
  function walk(node: CapabilityNode): void {
    count++;
    for (const child of node.children) {
      walk(child);
    }
  }
  for (const root of roots) {
    walk(root);
  }
  return count;
}

function maxDepth(roots: CapabilityNode[]): number {
  function depth(node: CapabilityNode, level: number): number {
    if (node.children.length === 0) return level;
    let max = level;
    for (const child of node.children) {
      const d = depth(child, level + 1);
      if (d > max) max = d;
    }
    return max;
  }

  let max = 0;
  for (const root of roots) {
    const d = depth(root, 0);
    if (d > max) max = d;
  }
  return max;
}

function computeSummary(roots: CapabilityNode[]): ModelSummary {
  return {
    nodes: countNodes(roots),
    roots: roots.length,
    max_depth: maxDepth(roots),
  };
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

export interface ImportResult {
  roots: CapabilityNode[];
  schema: SchemaType;
  fields: DetectedFields;
  summary: ModelSummary;
  warnings: BcmWarning[];
}

/**
 * Run the full import pipeline:
 *   parse -> unwrap -> detect schema -> detect fields -> normalize -> validate -> summarize
 */
export function importJson(
  raw: string,
  importOptions: ImportOptions = {},
): ImportResult {
  const allWarnings: BcmWarning[] = [];

  // 1. Parse
  const data = parseJson(raw);

  // 2. Unwrap
  const { items, warnings: unwrapWarnings } = unwrapData(
    data,
    importOptions.unwrap,
  );
  allWarnings.push(...unwrapWarnings);

  if (items.length === 0) {
    throw new BcmAppError(
      ErrorCode.ERR_VALIDATION_EMPTY_INPUT,
      "No capability items found after unwrapping",
    );
  }

  // 3. Detect schema
  const schema = detectSchema(items);
  if (schema === null) {
    throw new BcmAppError(
      ErrorCode.ERR_VALIDATION_SCHEMA_DETECT,
      "Could not detect schema type from input data",
    );
  }

  // 4. Detect fields (using first item as sample)
  const sample = items[0];
  const fields: DetectedFields = {
    name: findNameField(sample, importOptions.nameField),
    description: findDescField(sample, importOptions.descField),
    children: findChildrenField(sample, importOptions.childrenField),
    parent: findParentField(sample, importOptions.parentField),
    id: findIdField(sample, importOptions.idField),
  };

  // 5. Normalize
  const { roots, warnings: normalizeWarnings } = normalizeItems(
    items,
    schema,
    fields,
  );
  allWarnings.push(...normalizeWarnings);

  // 6. Validate
  const { errors: validationErrors, warnings: validationWarnings } =
    validateTree(roots);
  allWarnings.push(...validationWarnings);

  // Throw on hard validation errors (cycles, duplicate IDs)
  if (validationErrors.length > 0) {
    const first = validationErrors[0];
    throw new BcmAppError(
      first.code as ErrorCode,
      first.message,
      first.details as Record<string, unknown> | undefined,
    );
  }

  // 7. Summarize
  const summary = computeSummary(roots);

  return {
    roots,
    schema,
    fields,
    summary,
    warnings: allWarnings,
  };
}
