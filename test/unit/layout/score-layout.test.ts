import { describe, it, expect } from "vitest";
import { scoreLayout } from "../../../src/layout/score-layout.js";
import type { LayoutOptions, PackResult } from "../../../src/core/types.js";

const opts: LayoutOptions = {
  gap: 8, padding: 12, headerHeight: 40, rootGap: 30, viewMargin: 20,
  aspectRatio: 1.6, alignment: "center", maxDepth: -1, sortMode: "subtrees",
  minLeafWidth: 120, maxLeafWidth: 200, leafHeight: 45,
};

describe("scoreLayout", () => {
  it("returns Infinity for empty rows", () => {
    expect(scoreLayout({ w: 100, h: 100, rows: [] }, opts)).toBe(Infinity);
  });

  it("returns a finite number for non-empty layout", () => {
    const layout: PackResult = {
      w: 200, h: 125,
      rows: [{ items: [{ size: { w: 150, h: 45 }, _effectiveLeaf: true } as any], height: 45, width: 150 }],
    };
    const score = scoreLayout(layout, opts);
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThan(0);
  });

  it("prefers layouts closer to target aspect ratio", () => {
    const wide: PackResult = {
      w: 320, h: 200,
      rows: [{ items: [{ size: { w: 296, h: 45 }, _effectiveLeaf: true } as any], height: 45, width: 296 }],
    };
    const tall: PackResult = {
      w: 200, h: 400,
      rows: [
        { items: [{ size: { w: 176, h: 45 }, _effectiveLeaf: true } as any], height: 45, width: 176 },
        { items: [{ size: { w: 176, h: 45 }, _effectiveLeaf: true } as any], height: 45, width: 176 },
      ],
    };
    // 320/200 = 1.6 (exact match), 200/400 = 0.5 (far off)
    expect(scoreLayout(wide, opts)).toBeLessThan(scoreLayout(tall, opts));
  });
});
