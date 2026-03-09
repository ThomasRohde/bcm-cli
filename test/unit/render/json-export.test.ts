import { buildJsonExport } from "../../../src/render/json-export.js";
import type { LayoutResult, LayoutNode, CapabilityNode } from "../../../src/core/types.js";

function makeLayoutNode(overrides: Partial<LayoutNode> = {}): LayoutNode {
  return {
    id: "node-1",
    name: "Test Node",
    description: "A test node",
    depth: 0,
    _effectiveLeaf: false,
    size: { w: 200, h: 100 },
    position: { x: 10, y: 20 },
    rows: [{ items: [], height: 50, width: 100 }],
    children: [],
    ...overrides,
  };
}

function makeCapabilityNode(overrides: Partial<CapabilityNode> = {}): CapabilityNode {
  return {
    id: "node-1",
    name: "Test Node",
    description: "A test node",
    properties: { priority: "high", score: 42 },
    children: [],
    ...overrides,
  };
}

describe("buildJsonExport", () => {
  const leafNode = makeLayoutNode({
    id: "leaf-1",
    name: "Leaf",
    depth: 1,
    _effectiveLeaf: true,
    size: { w: 150, h: 55 },
    position: { x: 30, y: 70 },
    rows: [],
    children: [],
  });

  const rootLayout = makeLayoutNode({
    children: [leafNode],
  });

  const leafCap = makeCapabilityNode({
    id: "leaf-1",
    name: "Leaf",
    properties: { team: "alpha" },
    children: [],
  });

  const rootCap = makeCapabilityNode({
    children: [leafCap],
  });

  const layoutResult: LayoutResult = {
    nodes: [rootLayout],
    totalWidth: 1200,
    totalHeight: 800,
    leafSize: { w: 150, h: 55 },
  };

  it("produces correct canvas dimensions", () => {
    const result = buildJsonExport(layoutResult, [rootCap]);
    expect(result.version).toBe("1.0");
    expect(result.canvas).toEqual({
      width: 1200,
      height: 800,
      leafSize: { w: 150, h: 55 },
    });
  });

  it("strips rows and _effectiveLeaf, exposes isLeaf", () => {
    const result = buildJsonExport(layoutResult, [rootCap]);
    const root = result.nodes[0];
    expect(root).not.toHaveProperty("rows");
    expect(root).not.toHaveProperty("_effectiveLeaf");
    expect(root.isLeaf).toBe(false);

    const leaf = root.children[0];
    expect(leaf).not.toHaveProperty("rows");
    expect(leaf).not.toHaveProperty("_effectiveLeaf");
    expect(leaf.isLeaf).toBe(true);
  });

  it("merges properties from CapabilityNode", () => {
    const result = buildJsonExport(layoutResult, [rootCap]);
    expect(result.nodes[0].properties).toEqual({ priority: "high", score: 42 });
    expect(result.nodes[0].children[0].properties).toEqual({ team: "alpha" });
  });

  it("preserves position and size", () => {
    const result = buildJsonExport(layoutResult, [rootCap]);
    const root = result.nodes[0];
    expect(root.position).toEqual({ x: 10, y: 20 });
    expect(root.size).toEqual({ w: 200, h: 100 });
  });

  it("omits description when undefined", () => {
    const noDescLayout = makeLayoutNode({ description: undefined });
    const noDescCap = makeCapabilityNode({ description: undefined });
    const lr: LayoutResult = {
      nodes: [noDescLayout],
      totalWidth: 500,
      totalHeight: 300,
      leafSize: { w: 150, h: 55 },
    };
    const result = buildJsonExport(lr, [noDescCap]);
    expect(result.nodes[0]).not.toHaveProperty("description");
  });
});
