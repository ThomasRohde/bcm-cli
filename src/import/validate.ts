import type { CapabilityNode, BcmErrorDetail, BcmWarning } from "../core/types.js";
import { ErrorCode, isRetryable, suggestedAction } from "../cli/errors.js";

/**
 * Validate a tree of CapabilityNode objects.
 *
 * Checks performed:
 * - Duplicate ID detection
 * - Cycle detection via DFS gray/black (visiting/visited) coloring
 */
export function validateTree(
  roots: CapabilityNode[],
): { errors: BcmErrorDetail[]; warnings: BcmWarning[] } {
  const errors: BcmErrorDetail[] = [];
  const warnings: BcmWarning[] = [];

  // ------------------------------------------------------------------
  // Duplicate ID detection
  // ------------------------------------------------------------------
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();

  function collectIds(node: CapabilityNode): void {
    if (seenIds.has(node.id)) {
      duplicateIds.add(node.id);
    } else {
      seenIds.add(node.id);
    }
    for (const child of node.children) {
      collectIds(child);
    }
  }

  for (const root of roots) {
    collectIds(root);
  }

  for (const id of duplicateIds) {
    const code = ErrorCode.ERR_VALIDATION_DUPLICATE_ID;
    errors.push({
      code,
      message: `Duplicate node ID: "${id}"`,
      details: { id },
      retryable: isRetryable(code),
      suggested_action: suggestedAction(code),
    });
  }

  // ------------------------------------------------------------------
  // Cycle detection (DFS gray/black coloring)
  // ------------------------------------------------------------------
  const visiting = new Set<CapabilityNode>(); // gray — currently in DFS stack
  const visited = new Set<CapabilityNode>(); // black — fully processed

  function dfs(node: CapabilityNode, path: string[]): void {
    if (visited.has(node)) return;

    if (visiting.has(node)) {
      // Cycle detected
      const cyclePath = [...path, node.name].join(" -> ");
      const code = ErrorCode.ERR_VALIDATION_CYCLE;
      errors.push({
        code,
        message: `Cycle detected: ${cyclePath}`,
        details: { cycle: [...path, node.name] },
        retryable: isRetryable(code),
        suggested_action: suggestedAction(code),
      });
      return;
    }

    visiting.add(node);
    path.push(node.name);

    for (const child of node.children) {
      dfs(child, path);
    }

    path.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const root of roots) {
    dfs(root, []);
  }

  return { errors, warnings };
}
