import { describe, it, expect, beforeEach } from "vitest";
import { createStubMeasurer, createFontMeasurer, resetFontCache } from "../../../src/fonts/metrics.js";
import { join } from "node:path";
import { existsSync } from "node:fs";

describe("font metrics", () => {
  beforeEach(() => {
    resetFontCache();
  });
  describe("createStubMeasurer", () => {
    it("returns text.length * charWidth for non-empty text", () => {
      const measure = createStubMeasurer(7);
      expect(measure("Hello")).toBe(35); // 5 * 7
    });

    it("returns 40 for empty text", () => {
      const measure = createStubMeasurer();
      expect(measure("")).toBe(40);
    });

    it("returns 40 for whitespace-only text", () => {
      const measure = createStubMeasurer();
      expect(measure("   ")).toBe(40);
    });

    it("uses custom charWidth", () => {
      const measure = createStubMeasurer(10);
      expect(measure("AB")).toBe(20);
    });
  });

  describe("createFontMeasurer", () => {
    const fontPath = join(process.cwd(), "assets", "fonts", "Inter-Regular.ttf");

    it("falls back to stub when font path is invalid", async () => {
      const measure = await createFontMeasurer("/nonexistent/font.ttf", 9);
      // Should still produce a valid measurement (stub fallback)
      expect(measure("Test")).toBeGreaterThan(0);
    });

    it("loads Inter font when available", async () => {
      if (!existsSync(fontPath)) return; // skip if font not present
      const measure = await createFontMeasurer(fontPath, 12);
      const width = measure("Hello World");
      expect(width).toBeGreaterThan(0);
      // Real font produces proportional widths — narrow chars differ from wide chars
      const narrowWidth = measure("iiii"); // narrow characters
      const wideWidth = measure("WWWW");  // wide characters
      expect(wideWidth).toBeGreaterThan(narrowWidth);
    });

    it("caches by font path and size", async () => {
      if (!existsSync(fontPath)) return; // skip if font not present
      const measure12 = await createFontMeasurer(fontPath, 12);
      const measure12Again = await createFontMeasurer(fontPath, 12);
      const measure24 = await createFontMeasurer(fontPath, 24);

      expect(measure12Again).toBe(measure12);
      expect(measure24("Capability")).toBeGreaterThan(measure12("Capability"));
    });
  });
});
