import { describe, it, expect } from "vitest";
import { computeBandedFlowLayout } from "../../../src/layout/banded-flow-layout.js";
import type { LayoutNode } from "../../../src/core/types.js";
import { DEFAULT_LAYOUT_OPTIONS } from "../../../src/core/defaults.js";

function makeNode(name: string, w: number, h: number, isLeaf: boolean): LayoutNode {
  return {
    id: name, name, children: [],
    size: { w, h }, rows: [], position: { x: 0, y: 0 },
    depth: 0, _effectiveLeaf: isLeaf,
  };
}

describe("computeBandedFlowLayout", () => {
  it("produces a layout with rows for mixed subtrees and leaves", () => {
    const subtrees = [
      makeNode("Sub1", 200, 100, false),
      makeNode("Sub2", 200, 100, false),
    ];
    const leaves = [
      makeNode("L1", 120, 45, true),
      makeNode("L2", 120, 45, true),
      makeNode("L3", 120, 45, true),
    ];
    const result = computeBandedFlowLayout(subtrees, leaves, DEFAULT_LAYOUT_OPTIONS);
    expect(result.w).toBeGreaterThan(0);
    expect(result.h).toBeGreaterThan(0);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it("handles single subtree with many leaves", () => {
    const subtrees = [makeNode("Sub", 300, 150, false)];
    const leaves = Array.from({ length: 8 }, (_, i) =>
      makeNode(`L${i}`, 120, 45, true),
    );
    const result = computeBandedFlowLayout(subtrees, leaves, DEFAULT_LAYOUT_OPTIONS);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.w).toBeGreaterThan(0);
  });
});
