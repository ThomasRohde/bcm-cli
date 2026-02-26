import { describe, it, expect } from "vitest";
import { computeFlowLayout } from "../../../src/layout/flow-layout.js";
import type { LayoutNode, LayoutOptions } from "../../../src/core/types.js";

const opts: LayoutOptions = {
  gap: 8, padding: 12, headerHeight: 40, rootGap: 30, viewMargin: 20,
  aspectRatio: 1.6, alignment: "center", maxDepth: -1, sortMode: "subtrees",
  minLeafWidth: 120, maxLeafWidth: 200, leafHeight: 45,
};

function leaf(w: number): LayoutNode {
  return {
    id: "l", name: "L", children: [], size: { w, h: 45 }, rows: [],
    position: { x: 0, y: 0 }, depth: 0, _effectiveLeaf: true,
  } as LayoutNode;
}

describe("computeFlowLayout", () => {
  it("handles empty children", () => {
    const r = computeFlowLayout([], opts);
    expect(r.rows).toHaveLength(0);
  });

  it("handles single child", () => {
    const r = computeFlowLayout([leaf(120)], opts);
    expect(r.rows).toHaveLength(1);
    expect(r.w).toBe(120 + 2 * opts.padding);
  });

  it("selects best layout from multiple candidates", () => {
    const children = [leaf(120), leaf(120), leaf(120)];
    const r = computeFlowLayout(children, opts);
    expect(r.rows.length).toBeGreaterThanOrEqual(1);
    expect(r.w).toBeGreaterThan(0);
    expect(r.h).toBeGreaterThan(0);
  });
});
