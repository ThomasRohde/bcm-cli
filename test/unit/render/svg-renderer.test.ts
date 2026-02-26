import { describe, it, expect } from "vitest";
import { renderSvg } from "../../../src/render/svg-renderer.js";
import { DEFAULT_THEME } from "../../../src/core/defaults.js";
import { layoutTrees } from "../../../src/layout/index.js";
import type { CapabilityNode, LayoutOptions } from "../../../src/core/types.js";

const opts: LayoutOptions = {
  gap: 8, padding: 12, headerHeight: 40, rootGap: 30, viewMargin: 20,
  aspectRatio: 1.6, alignment: "center", maxDepth: -1, sortMode: "subtrees",
  minLeafWidth: 120, maxLeafWidth: 200, leafHeight: 45,
};

const stubMeasure = (t: string) => t.length * 7;

describe("svg-renderer", () => {
  it("produces valid SVG structure", () => {
    const roots: CapabilityNode[] = [{
      id: "r", name: "Root", properties: {},
      children: [{ id: "c", name: "Child", children: [], properties: {} }],
    }];
    const layout = layoutTrees(roots, opts, stubMeasure);
    const svg = renderSvg(layout, DEFAULT_THEME);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<rect");
    expect(svg).toContain("<text");
  });

  it("contains node names as text", () => {
    const roots: CapabilityNode[] = [{
      id: "r", name: "MyRoot", properties: {},
      children: [{ id: "c", name: "MyChild", children: [], properties: {} }],
    }];
    const layout = layoutTrees(roots, opts, stubMeasure);
    const svg = renderSvg(layout, DEFAULT_THEME);
    expect(svg).toContain("MyRoot");
    expect(svg).toContain("MyChild");
  });

  it("uses depth colors from theme", () => {
    const roots: CapabilityNode[] = [{
      id: "r", name: "Root", properties: {},
      children: [{ id: "c", name: "Leaf", children: [], properties: {} }],
    }];
    const layout = layoutTrees(roots, opts, stubMeasure);
    const svg = renderSvg(layout, DEFAULT_THEME);
    expect(svg).toContain(DEFAULT_THEME.palette.depthFills[0]); // root color
    expect(svg).toContain(DEFAULT_THEME.palette.leafFill); // leaf color
  });
});
