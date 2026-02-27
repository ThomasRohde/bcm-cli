import { describe, it, expect } from "vitest";
import { SvgBuilder } from "../../../src/render/svg-builder.js";

describe("SvgBuilder", () => {
  it("generates a rect element", () => {
    const svg = new SvgBuilder().rect({ x: 0, y: 0, width: 100, height: 50 }).toString(200, 200);
    expect(svg).toContain("<rect");
    expect(svg).toContain('width="100"');
    expect(svg).toContain('height="50"');
  });

  it("escapes text content", () => {
    const svg = new SvgBuilder().text("A & B <C>", { x: 0, y: 0 }).toString(100, 100);
    expect(svg).toContain("A &amp; B &lt;C&gt;");
  });

  it("renders multiline text with tspans", () => {
    const svg = new SvgBuilder()
      .textLines(["First", "Second"], { x: 50, y: 50, "text-anchor": "middle" }, 12)
      .toString(100, 100);
    expect(svg).toContain("<tspan");
    expect(svg).toContain(">First</tspan>");
    expect(svg).toContain(">Second</tspan>");
  });

  it("sets SVG dimensions in toString output", () => {
    const svg = new SvgBuilder().toString(500, 300);
    expect(svg).toContain('width="500"');
    expect(svg).toContain('height="300"');
    expect(svg).toContain('viewBox="0 0 500 300"');
  });

  it("supports groups", () => {
    const svg = new SvgBuilder()
      .openGroup({ id: "test" })
      .rect({ x: 0, y: 0, width: 10, height: 10 })
      .closeGroup()
      .toString(100, 100);
    expect(svg).toContain('<g id="test">');
    expect(svg).toContain("</g>");
  });
});
