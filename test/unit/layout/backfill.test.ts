import { describe, it, expect } from "vitest";
import { backfillRowsWithLeaves } from "../../../src/layout/backfill.js";
import type { LayoutNode, RowMeta } from "../../../src/core/types.js";
import { DEFAULT_LAYOUT_OPTIONS } from "../../../src/core/defaults.js";

function makeLeaf(name: string, w: number = 120, h: number = 45): LayoutNode {
  return {
    id: name, name, children: [],
    size: { w, h }, rows: [], position: { x: 0, y: 0 },
    depth: 0, _effectiveLeaf: true,
  };
}

function makeSubtree(name: string, w: number, h: number): LayoutNode {
  return {
    id: name, name, children: [],
    size: { w, h }, rows: [], position: { x: 0, y: 0 },
    depth: 0, _effectiveLeaf: false,
  };
}

describe("backfillRowsWithLeaves", () => {
  it("returns all leaves when no room exists", () => {
    const sub = makeSubtree("Sub", 400, 100);
    const row: RowMeta = { items: [sub], height: 100, width: 400 };
    const leaves = [makeLeaf("L1"), makeLeaf("L2")];
    const remaining = backfillRowsWithLeaves([row], leaves, 400, DEFAULT_LAYOUT_OPTIONS);
    // Content width equals row width, so no space remains
    expect(remaining).toHaveLength(2);
  });

  it("fills empty space in rows with leaves", () => {
    const sub = makeSubtree("Sub", 200, 100);
    const row: RowMeta = { items: [sub], height: 100, width: 200 };
    const leaves = [makeLeaf("L1"), makeLeaf("L2")];
    const remaining = backfillRowsWithLeaves([row], leaves, 500, DEFAULT_LAYOUT_OPTIONS);
    expect(remaining.length).toBeLessThan(2);
  });

  it("returns empty array when no leaves provided", () => {
    const row: RowMeta = { items: [], height: 100, width: 0 };
    const remaining = backfillRowsWithLeaves([row], [], 500, DEFAULT_LAYOUT_OPTIONS);
    expect(remaining).toHaveLength(0);
  });
});
