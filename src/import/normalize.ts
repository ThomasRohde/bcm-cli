import type {
  CapabilityNode,
  SchemaType,
  DetectedFields,
  BcmWarning,
} from "../core/types.js";
import { BcmAppError, ErrorCode } from "../cli/errors.js";
import {
  findNameField,
  findDescField,
  findChildrenField,
  findParentField,
  findIdField,
} from "./fields.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simple slugify: lowercase, replace non-alphanumeric runs with a single
 * hyphen, trim leading/trailing hyphens.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build a deterministic ID from a name and a parent path prefix.
 */
function makeId(name: string, parentPath: string, index: number): string {
  const slug = slugify(name);
  const base = parentPath ? `${parentPath}/${slug}` : slug;
  // Append index to guarantee uniqueness among siblings
  return `${base}_${index}`;
}

/**
 * Collect extra scalar fields into a properties bag, skipping the known
 * structural fields.
 */
function collectProperties(
  obj: Record<string, unknown>,
  skip: Set<string>,
): Record<string, string | number | boolean> {
  const props: Record<string, string | number | boolean> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (skip.has(key)) continue;
    if (
      typeof val === "string" ||
      typeof val === "number" ||
      typeof val === "boolean"
    ) {
      props[key] = val;
    }
  }
  return props;
}

// ---------------------------------------------------------------------------
// normalizeNode (nested schema)
// ---------------------------------------------------------------------------

/**
 * Recursively normalize a single JSON object into a CapabilityNode.
 * Used for the "nested" schema where children are embedded in each node.
 */
export function normalizeNode(
  obj: Record<string, unknown>,
  nameField: string | null,
  descField: string | null,
  childrenField: string | null,
  parentPath: string,
  index: number,
): CapabilityNode {
  const rawName = nameField ? String(obj[nameField] ?? "") : "";
  const name = rawName.trim() || "-- unnamed --";
  const description = descField
    ? (obj[descField] as string | undefined) ?? undefined
    : undefined;

  const id = makeId(name, parentPath, index);
  const currentPath = parentPath ? `${parentPath}/${slugify(name)}` : slugify(name);

  // Structural fields to skip when collecting properties
  const skipFields = new Set<string>();
  if (nameField) skipFields.add(nameField);
  if (descField) skipFields.add(descField);
  if (childrenField) skipFields.add(childrenField);

  const properties = collectProperties(obj, skipFields);

  // Recurse into children
  const children: CapabilityNode[] = [];
  if (childrenField && Array.isArray(obj[childrenField])) {
    const rawChildren = obj[childrenField] as Record<string, unknown>[];
    for (let i = 0; i < rawChildren.length; i++) {
      const child = rawChildren[i];
      if (typeof child === "object" && child !== null) {
        children.push(
          normalizeNode(
            child,
            findNameField(child, nameField ?? undefined),
            findDescField(child, descField ?? undefined),
            findChildrenField(child, childrenField ?? undefined),
            currentPath,
            i,
          ),
        );
      }
    }
  }

  return { id, name, description, properties, children };
}

// ---------------------------------------------------------------------------
// buildTreeFromFlat
// ---------------------------------------------------------------------------

interface FlatNodeEntry {
  node: CapabilityNode;
  parentRef: string | null;
}

/**
 * Build a tree from a flat list of items that reference parents by name or id.
 * Two-pass algorithm:
 *   1. Create all nodes in a map keyed by their original id/name.
 *   2. Wire children to parents; unresolved parents become roots with a warning.
 */
export function buildTreeFromFlat(
  items: Record<string, unknown>[],
  nameField: string | null,
  descField: string | null,
  parentField: string | null,
  idField: string | null,
): { roots: CapabilityNode[]; warnings: BcmWarning[] } {
  const warnings: BcmWarning[] = [];

  // Structural fields to skip when collecting properties
  const skipFields = new Set<string>();
  if (nameField) skipFields.add(nameField);
  if (descField) skipFields.add(descField);
  if (parentField) skipFields.add(parentField);
  if (idField) skipFields.add(idField);

  // Pass 1: create nodes
  const entries: FlatNodeEntry[] = [];
  // Map from original reference (id or name) → index in entries
  const refMap = new Map<string, number>();
  const seenOriginalIds = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const obj = items[i];
    const rawName = nameField ? String(obj[nameField] ?? "") : "";
    const name = rawName.trim() || "-- unnamed --";
    const description = descField
      ? (obj[descField] as string | undefined) ?? undefined
      : undefined;

    const originalId = idField ? String(obj[idField] ?? "") : "";
    const id = originalId
      ? `${slugify(originalId)}_${i}`
      : makeId(name, "", i);

    // Detect duplicate original IDs
    if (originalId) {
      if (seenOriginalIds.has(originalId)) {
        warnings.push({
          code: "WARN_DUPLICATE_ORIGINAL_ID",
          message: `Duplicate ID "${originalId}" at index ${i} for "${name}"`,
          details: { id: originalId, index: i, name },
        });
      }
      seenOriginalIds.add(originalId);
    }

    const properties = collectProperties(obj, skipFields);

    const parentRef = parentField
      ? (obj[parentField] as string | null) ?? null
      : null;

    const node: CapabilityNode = {
      id,
      name,
      description,
      properties,
      children: [],
    };

    entries.push({ node, parentRef });

    // Register under original id and name for lookup
    if (originalId) refMap.set(originalId, i);
    refMap.set(name, i);
  }

  // Pre-wiring cycle detection: follow parent chains in the index graph
  // to detect cycles BEFORE creating object references (which would cause
  // infinite recursion in any tree walk).
  const parentIdxMap = new Map<number, number>();
  for (let i = 0; i < entries.length; i++) {
    const ref = entries[i].parentRef;
    if (ref && ref.trim() !== "") {
      const pi = refMap.get(ref);
      if (pi !== undefined) {
        parentIdxMap.set(i, pi);
      }
    }
  }

  const confirmed = new Set<number>();
  for (let i = 0; i < entries.length; i++) {
    if (confirmed.has(i)) continue;
    const chain: number[] = [];
    const inChain = new Set<number>();
    let cur: number | undefined = i;
    while (cur !== undefined && !confirmed.has(cur) && !inChain.has(cur)) {
      chain.push(cur);
      inChain.add(cur);
      cur = parentIdxMap.get(cur);
    }
    if (cur !== undefined && inChain.has(cur)) {
      // Cycle detected — extract cycle path from the repeated node onward
      const cycleStart = chain.indexOf(cur);
      const cycleIndices = chain.slice(cycleStart);
      const cycleNames = cycleIndices.map((idx) => entries[idx].node.name);
      cycleNames.push(entries[cur].node.name); // close the cycle
      throw new BcmAppError(
        ErrorCode.ERR_VALIDATION_CYCLE,
        `Cycle detected in parent references: ${cycleNames.join(" -> ")}`,
        { cycle: cycleNames },
      );
    }
    for (const idx of chain) {
      confirmed.add(idx);
    }
  }

  // Pass 2: wire parents (safe — no cycles)
  const roots: CapabilityNode[] = [];

  for (const entry of entries) {
    if (!entry.parentRef || entry.parentRef.trim() === "") {
      roots.push(entry.node);
      continue;
    }

    const parentIdx = refMap.get(entry.parentRef);
    if (parentIdx !== undefined) {
      entries[parentIdx].node.children.push(entry.node);
    } else {
      // Unresolved parent — promote to root with warning
      warnings.push({
        code: "WARN_UNRESOLVED_PARENT",
        message: `Parent "${entry.parentRef}" not found for "${entry.node.name}"; promoted to root`,
        details: {
          nodeName: entry.node.name,
          parentRef: entry.parentRef,
        },
      });
      roots.push(entry.node);
    }
  }

  return { roots, warnings };
}

// ---------------------------------------------------------------------------
// normalizeSimple
// ---------------------------------------------------------------------------

function normalizeSimple(
  items: Record<string, unknown>[],
  nameField: string | null,
  descField: string | null,
): CapabilityNode[] {
  const skipFields = new Set<string>();
  if (nameField) skipFields.add(nameField);
  if (descField) skipFields.add(descField);

  return items.map((obj, i) => {
    const rawName = nameField ? String(obj[nameField] ?? "") : "";
    const name = rawName.trim() || "-- unnamed --";
    const description = descField
      ? (obj[descField] as string | undefined) ?? undefined
      : undefined;
    const id = makeId(name, "", i);
    const properties = collectProperties(obj, skipFields);

    return { id, name, description, properties, children: [] };
  });
}

// ---------------------------------------------------------------------------
// normalizeItems (main dispatcher)
// ---------------------------------------------------------------------------

/**
 * Normalize raw items into a tree of CapabilityNode objects based on the
 * detected schema type and field mappings.
 */
export function normalizeItems(
  items: Record<string, unknown>[],
  schema: SchemaType,
  fields: DetectedFields,
): { roots: CapabilityNode[]; warnings: BcmWarning[] } {
  const warnings: BcmWarning[] = [];

  // Check for duplicate original IDs across all schemas
  if (fields.id) {
    const seen = new Map<string, number>();
    for (let i = 0; i < items.length; i++) {
      const origId = String(items[i][fields.id] ?? "");
      if (!origId) continue;
      if (seen.has(origId)) {
        warnings.push({
          code: "WARN_DUPLICATE_ORIGINAL_ID",
          message: `Duplicate ID "${origId}" at index ${i}`,
          details: { id: origId, index: i, firstIndex: seen.get(origId) },
        });
      } else {
        seen.set(origId, i);
      }
    }
  }

  switch (schema) {
    case "nested": {
      const roots: CapabilityNode[] = [];
      for (let i = 0; i < items.length; i++) {
        roots.push(
          normalizeNode(
            items[i],
            fields.name,
            fields.description,
            fields.children,
            "",
            i,
          ),
        );
      }
      return { roots, warnings };
    }

    case "flat": {
      const result = buildTreeFromFlat(
        items,
        fields.name,
        fields.description,
        fields.parent,
        fields.id,
      );
      result.warnings.unshift(...warnings);
      return result;
    }

    case "simple": {
      return {
        roots: normalizeSimple(items, fields.name, fields.description),
        warnings,
      };
    }

    default: {
      // Should not happen — but treat as simple
      return {
        roots: normalizeSimple(items, fields.name, fields.description),
        warnings,
      };
    }
  }
}
