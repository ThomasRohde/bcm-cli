import { describe, it, expect } from "vitest";
import { calculateSize } from "../../../src/layout/calculate-size.js";
import type { LayoutNode } from "../../../src/core/types.js";
import { DEFAULT_LAYOUT_OPTIONS } from "../../../src/core/defaults.js";

function makeNode(name: string, children: LayoutNode[] = []): LayoutNode {
  return {
    id: name, name, children,
    size: { w: 0, h: 0 }, rows: [], position: { x: 0, y: 0 },
    depth: 0, _effectiveLeaf: false,
  };
}

describe("calculateSize", () => {
  const opts = DEFAULT_LAYOUT_OPTIONS;

  it("sizes a leaf node to uniform dimensions", () => {
    const leaf = makeNode("Leaf");
    calculateSize(leaf, 0, 150, 45, opts);
    expect(leaf.size.w).toBe(150);
    expect(leaf.size.h).toBe(45);
    expect(leaf._effectiveLeaf).toBe(true);
  });

  it("parent encompasses children", () => {
    const child1 = makeNode("A");
    const child2 = makeNode("B");
    const parent = makeNode("Parent", [child1, child2]);
    calculateSize(parent, 0, 150, 45, opts);
    expect(parent.size.w).toBeGreaterThan(150);
    expect(parent.size.h).toBeGreaterThan(45);
    expect(parent._effectiveLeaf).toBe(false);
  });

  it("treats deep nodes as effective leaves when maxDepth is reached", () => {
    const deep = makeNode("Deep", [makeNode("Hidden")]);
    const optsWithDepth = { ...opts, maxDepth: 0 };
    calculateSize(deep, 0, 150, 45, optsWithDepth);
    expect(deep._effectiveLeaf).toBe(true);
    expect(deep.size.w).toBe(150);
    expect(deep.size.h).toBe(45);
  });
});
