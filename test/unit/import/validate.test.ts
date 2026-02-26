import { describe, it, expect } from "vitest";
import { validateTree } from "../../../src/import/validate.js";
import type { CapabilityNode } from "../../../src/core/types.js";

function makeNode(id: string, children: CapabilityNode[] = []): CapabilityNode {
  return { id, name: id, children, properties: {} };
}

describe("validateTree", () => {
  it("passes valid tree", () => {
    const tree = [makeNode("a", [makeNode("b"), makeNode("c")])];
    const { errors, warnings } = validateTree(tree);
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it("detects duplicate IDs", () => {
    const tree = [makeNode("a", [makeNode("dup"), makeNode("dup")])];
    const { errors } = validateTree(tree);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe("ERR_VALIDATION_DUPLICATE_ID");
  });
});
