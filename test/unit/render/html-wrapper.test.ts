import { describe, it, expect } from "vitest";
import { wrapHtml } from "../../../src/render/html-wrapper.js";
import { DEFAULT_THEME } from "../../../src/core/defaults.js";

describe("wrapHtml", () => {
  const svg = '<svg width="100" height="100"></svg>';

  it("includes DOCTYPE declaration", () => {
    const html = wrapHtml(svg, 100, 100, DEFAULT_THEME);
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("embeds the SVG content", () => {
    const html = wrapHtml(svg, 100, 100, DEFAULT_THEME);
    expect(html).toContain(svg);
  });

  it("applies background color from theme", () => {
    const theme = {
      ...DEFAULT_THEME,
      palette: { ...DEFAULT_THEME.palette, background: "#FF0000" },
    };
    const html = wrapHtml(svg, 100, 100, theme);
    expect(html).toContain("#FF0000");
  });

  it("sets viewport width", () => {
    const html = wrapHtml(svg, 800, 600, DEFAULT_THEME);
    expect(html).toContain("width=800");
  });
});
