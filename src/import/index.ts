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
  findLevelField,
} from "./fields.js";
import { normalizeItems } from "./normalize.js";
import { validateTree } from "./validate.js";
import { parseCsv, inferParentsFromLevels } from "./csv-parser.js";
import { detectFormat } from "./format.js";

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
  findLevelField,
} from "./fields.js";
export { normalizeNode, buildTreeFromFlat, normalizeItems } from "./normalize.js";
export { validateTree } from "./validate.js";
export { parseCsv, inferParentsFromLevels } from "./csv-parser.js";
export { detectFormat } from "./format.js";

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

export function summarizeModel(roots: CapabilityNode[]): ModelSummary {
  return {
    nodes: countNodes(roots),
    roots: roots.length,
    max_depth: maxDepth(roots),
  };
}

// ---------------------------------------------------------------------------
// Root filtering
// ---------------------------------------------------------------------------

export function filterRoots(
  roots: CapabilityNode[],
  selectors: string[],
): { filtered: CapabilityNode[]; warnings: BcmWarning[] } {
  const warnings: BcmWarning[] = [];
  const matched: CapabilityNode[] = [];
  const matchedSelectors = new Set<string>();

  for (const root of roots) {
    for (const sel of selectors) {
      if (root.name === sel || root.id === sel) {
        matched.push(root);
        matchedSelectors.add(sel);
        break;
      }
    }
  }

  for (const sel of selectors) {
    if (!matchedSelectors.has(sel)) {
      warnings.push({
        code: "WARN_ROOT_NOT_FOUND",
        message: `Root selector "${sel}" did not match any root node`,
        details: { selector: sel },
      });
    }
  }

  return { filtered: matched, warnings };
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

  // 4b. Fail if no name field detected
  if (fields.name === null) {
    throw new BcmAppError(
      ErrorCode.ERR_VALIDATION_NO_NAME_FIELD,
      "No name field detected in input data",
      { sampleKeys: Object.keys(sample) },
    );
  }

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
  const summary = summarizeModel(roots);

  return {
    roots,
    schema,
    fields,
    summary,
    warnings: allWarnings,
  };
}

// ---------------------------------------------------------------------------
// CSV/TSV import pipeline
// ---------------------------------------------------------------------------

function importCsv(
  raw: string,
  importOptions: ImportOptions,
  dialect: "csv" | "tsv",
): ImportResult {
  const allWarnings: BcmWarning[] = [];

  // 1. Parse CSV/TSV into row objects
  const items = parseCsv(raw, dialect);

  if (items.length === 0) {
    throw new BcmAppError(
      ErrorCode.ERR_VALIDATION_EMPTY_INPUT,
      "No capability items found in CSV input",
    );
  }

  // 2. Detect fields from first row
  const sample = items[0] as Record<string, unknown>;
  const fields: DetectedFields = {
    name: findNameField(sample, importOptions.nameField),
    description: findDescField(sample, importOptions.descField),
    children: null, // CSV rows never have embedded children
    parent: findParentField(sample, importOptions.parentField),
    id: findIdField(sample, importOptions.idField),
    level: findLevelField(sample, importOptions.levelField),
  };

  if (fields.name === null) {
    throw new BcmAppError(
      ErrorCode.ERR_VALIDATION_NO_NAME_FIELD,
      "No name field detected in CSV input",
      { sampleKeys: Object.keys(sample) },
    );
  }

  // 3. Infer hierarchy from level column if no parent column exists
  if (fields.parent === null && fields.level != null) {
    inferParentsFromLevels(
      items as Record<string, string | number | boolean>[],
      fields.level as string,
      fields.name,
      fields.id,
    );
    // The inferred parent field acts as the parent column
    fields.parent = "__inferred_parent";
  }

  // 4. Detect schema — CSV with parent is "flat", otherwise "simple"
  const schema: SchemaType = fields.parent ? "flat" : "simple";

  // 5. Normalize using existing pipeline
  const { roots, warnings: normalizeWarnings } = normalizeItems(
    items as Record<string, unknown>[],
    schema,
    fields,
  );
  allWarnings.push(...normalizeWarnings);

  // 6. Validate
  const { errors: validationErrors, warnings: validationWarnings } =
    validateTree(roots);
  allWarnings.push(...validationWarnings);

  if (validationErrors.length > 0) {
    const first = validationErrors[0];
    throw new BcmAppError(
      first.code as ErrorCode,
      first.message,
      first.details as Record<string, unknown> | undefined,
    );
  }

  // 7. Summarize
  const summary = summarizeModel(roots);

  return {
    roots,
    schema,
    fields,
    summary,
    warnings: allWarnings,
  };
}

// ---------------------------------------------------------------------------
// Unified entry point
// ---------------------------------------------------------------------------

/**
 * Import data from JSON, CSV, or TSV. Detects format from file extension
 * unless explicitly specified via `importOptions.format`.
 */
export function importData(
  raw: string,
  importOptions: ImportOptions = {},
  filePath?: string,
): ImportResult {
  const format = importOptions.format ?? detectFormat(filePath);

  if (format === "csv" || format === "tsv") {
    return importCsv(raw, importOptions, format);
  }

  return importJson(raw, importOptions);
}
