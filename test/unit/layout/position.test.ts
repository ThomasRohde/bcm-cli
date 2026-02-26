import { describe, it, expect } from "vitest";
import { layoutTrees } from "../../../src/layout/index.js";
import type { CapabilityNode, LayoutOptions } from "../../../src/core/types.js";

const opts: LayoutOptions = {
  gap: 8, padding: 12, headerHeight: 40, rootGap: 30, viewMargin: 20,
  aspectRatio: 1.6, alignment: "center", maxDepth: -1, sortMode: "subtrees",
  minLeafWidth: 120, maxLeafWidth: 200, leafHeight: 45,
};

const stubMeasure = (t: string) => t.length * 7;

describe("position", () => {
  it("positions roots starting at viewMargin", () => {
    const roots: CapabilityNode[] = [
      { id: "a", name: "A", children: [], properties: {} },
      { id: "b", name: "B", children: [], properties: {} },
    ];
    const result = layoutTrees(roots, opts, stubMeasure);
    const rootNodes = result.nodes.filter(n => n.depth === 0);
    expect(rootNodes[0].position.x).toBe(opts.viewMargin);
    expect(rootNodes[0].position.y).toBe(opts.viewMargin);
    expect(rootNodes[1].position.x).toBeGreaterThan(rootNodes[0].position.x);
  });

  it("children are positioned within parent bounds", () => {
    const roots: CapabilityNode[] = [{
      id: "p", name: "Parent", properties: {},
      children: [
        { id: "c1", name: "Child 1", children: [], properties: {} },
        { id: "c2", name: "Child 2", children: [], properties: {} },
      ],
    }];
    const result = layoutTrees(roots, opts, stubMeasure);
    const parent = result.nodes.find(n => n.id === "p")!;
    const child = result.nodes.find(n => n.id === "c1")!;
    expect(child.position.x).toBeGreaterThanOrEqual(parent.position.x);
    expect(child.position.y).toBeGreaterThanOrEqual(parent.position.y + opts.headerHeight);
  });
});
