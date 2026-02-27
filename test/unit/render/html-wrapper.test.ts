import { describe, it, expect } from "vitest";
import { wrapHtml, type HtmlNodeMeta } from "../../../src/render/html-wrapper.js";
import { DEFAULT_THEME } from "../../../src/core/defaults.js";

describe("wrapHtml", () => {
  const svg = '<svg width="100" height="100"></svg>';
  const nodes: HtmlNodeMeta[] = [
    {
      id: "node-1",
      name: "Capability One",
      description:
        "**Bold** line with [link](https://example.com) and <script>alert('xss')</script>",
      depth: 1,
      isLeaf: true,
      x: 12,
      y: 20,
      w: 100,
      h: 45,
    },
  ];

  it("includes DOCTYPE declaration", () => {
    const html = wrapHtml(svg, 100, 100, DEFAULT_THEME, nodes);
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("embeds the SVG content", () => {
    const html = wrapHtml(svg, 100, 100, DEFAULT_THEME, nodes);
    expect(html).toContain(svg);
  });

  it("includes interactive explorer shell", () => {
    const html = wrapHtml(svg, 100, 100, DEFAULT_THEME, nodes);
    expect(html).toContain('id="bcm-search-input"');
    expect(html).toContain('id="bcm-results-list"');
    expect(html).toContain('id="bcm-tooltip"');
    expect(html).toContain('id="bcm-node-data"');
  });

  it("renders markdown and sanitizes unsafe content in node payload", () => {
    const html = wrapHtml(svg, 100, 100, DEFAULT_THEME, nodes);
    const match = html.match(
      /<script id="bcm-node-data" type="application\/json">([\s\S]*?)<\/script>/,
    );
    expect(match).not.toBeNull();

    const payload = JSON.parse(match?.[1] ?? "[]") as Array<{
      descriptionHtml: string;
      searchText: string;
    }>;
    expect(payload).toHaveLength(1);
    expect(payload[0].descriptionHtml).toContain("<strong>Bold</strong>");
    expect(payload[0].descriptionHtml).toContain('href="https://example.com"');
    expect(payload[0].descriptionHtml).not.toContain("<script");
    expect(payload[0].descriptionHtml).not.toContain("alert(");
    expect(payload[0].searchText).toContain("capability one");
  });

  it("uses device-width viewport for responsive output", () => {
    const html = wrapHtml(svg, 800, 600, DEFAULT_THEME, nodes);
    expect(html).toContain('width=device-width');
  });
});
