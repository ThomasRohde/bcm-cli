import { describe, it, expect } from "vitest";
import { computeUniformLeafSize } from "../../../src/layout/leaf-sizing.js";
import type { LayoutNode, LayoutOptions } from "../../../src/core/types.js";
import { DEFAULT_LAYOUT_OPTIONS } from "../../../src/core/defaults.js";

function makeLeaf(name: string): LayoutNode {
  return {
    id: name, name, children: [],
    size: { w: 0, h: 0 }, rows: [], position: { x: 0, y: 0 },
    depth: 0, _effectiveLeaf: true,
  };
}

const stubMeasure = (text: string) => text.length * 7;

describe("computeUniformLeafSize", () => {
  it("clamps to minLeafWidth when text is short", () => {
    const roots = [makeLeaf("Hi")];
    const opts = { ...DEFAULT_LAYOUT_OPTIONS, minLeafWidth: 120, maxLeafWidth: 200 };
    const { leafWidth } = computeUniformLeafSize(roots, opts, stubMeasure);
    expect(leafWidth).toBe(120); // 2*7 + 24 + 10 = 48, clamped to min 120
  });

  it("clamps to maxLeafWidth when text is long", () => {
    const roots = [makeLeaf("A very long capability name that exceeds maximum")];
    const opts = { ...DEFAULT_LAYOUT_OPTIONS, minLeafWidth: 120, maxLeafWidth: 200 };
    const { leafWidth } = computeUniformLeafSize(roots, opts, stubMeasure);
    expect(leafWidth).toBe(200);
  });

  it("computes width between bounds for moderate text", () => {
    const roots = [makeLeaf("Moderate Name Here")]; // 18 chars * 7 = 126 + 34 = 160
    const opts = { ...DEFAULT_LAYOUT_OPTIONS, minLeafWidth: 100, maxLeafWidth: 200 };
    const { leafWidth } = computeUniformLeafSize(roots, opts, stubMeasure);
    expect(leafWidth).toBeGreaterThan(100);
    expect(leafWidth).toBeLessThanOrEqual(200);
  });

  it("returns configured leafHeight", () => {
    const roots = [makeLeaf("Test")];
    const opts = { ...DEFAULT_LAYOUT_OPTIONS, leafHeight: 55 };
    const { leafHeight } = computeUniformLeafSize(roots, opts, stubMeasure);
    expect(leafHeight).toBe(55);
  });
});
