import { describe, it, expect } from "vitest";
import { packRows } from "../../../src/layout/pack-rows.js";
import type { LayoutNode, LayoutOptions } from "../../../src/core/types.js";

const opts: LayoutOptions = {
  gap: 8, padding: 12, headerHeight: 40, rootGap: 30, viewMargin: 20,
  aspectRatio: 1.6, alignment: "center", maxDepth: -1, sortMode: "subtrees",
  minLeafWidth: 120, maxLeafWidth: 200, leafHeight: 45,
};

function leaf(w: number, h: number = 45): LayoutNode {
  return {
    id: "l", name: "L", children: [], size: { w, h }, rows: [],
    position: { x: 0, y: 0 }, depth: 0, _effectiveLeaf: true,
  } as LayoutNode;
}

describe("packRows", () => {
  it("packs children into a single row when they fit", () => {
    const result = packRows([leaf(100), leaf(100)], 300, opts);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].items).toHaveLength(2);
  });

  it("wraps to multiple rows when content exceeds width", () => {
    const result = packRows([leaf(100), leaf(100), leaf(100)], 240, opts);
    expect(result.rows.length).toBeGreaterThan(1);
  });

  it("returns correct dimensions", () => {
    const result = packRows([leaf(100)], 200, opts);
    expect(result.w).toBe(100 + 2 * opts.padding);
    expect(result.h).toBe(opts.headerHeight + 45 + opts.padding);
  });

  it("handles empty children", () => {
    const result = packRows([], 200, opts);
    expect(result.rows).toHaveLength(0);
    expect(result.h).toBe(opts.headerHeight + opts.padding);
  });
});
