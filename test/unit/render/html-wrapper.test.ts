import { describe, it, expect } from "vitest";
import { wrapHtml, wrapConfluenceHtml, type HtmlNodeMeta } from "../../../src/render/html-wrapper.js";
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

describe("wrapConfluenceHtml", () => {
  const fullHtml = '<!DOCTYPE html><html><head></head><body><p>Hello</p></body></html>';

  it("wraps content in div with script", () => {
    const result = wrapConfluenceHtml(fullHtml, 600);
    expect(result).toContain('class="bcm-confluence-wrapper"');
    expect(result).toContain("<script>");
    expect(result).toContain("iframe");
  });

  it("base64-encodes the full HTML", () => {
    const result = wrapConfluenceHtml(fullHtml, 600);
    const expected = Buffer.from(fullHtml, "utf-8").toString("base64");
    expect(result).toContain(expected);
  });

  it("does not contain raw source HTML tags", () => {
    const result = wrapConfluenceHtml(fullHtml, 600);
    expect(result).not.toContain("<!DOCTYPE html>");
    expect(result).not.toContain("<html>");
    expect(result).not.toContain("</html>");
  });

  it("includes noscript fallback", () => {
    const result = wrapConfluenceHtml(fullHtml, 600);
    expect(result).toContain("<noscript>");
    expect(result).toContain("JavaScript is required");
  });

  it("round-trips correctly through base64", () => {
    const result = wrapConfluenceHtml(fullHtml, 600);
    const match = result.match(/atob\("([^"]+)"\)/);
    expect(match).not.toBeNull();
    const decoded = Buffer.from(match![1], "base64").toString("utf-8");
    expect(decoded).toBe(fullHtml);
  });

  it("includes sandbox attribute on iframe", () => {
    const result = wrapConfluenceHtml(fullHtml, 600);
    expect(result).toContain('sandbox');
    expect(result).toContain('allow-scripts');
    expect(result).toContain('allow-same-origin');
  });

  it("sets height to map height plus UI chrome", () => {
    const result = wrapConfluenceHtml(fullHtml, 2000);
    expect(result).toContain("height:2150px");
  });
});
