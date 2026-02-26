import { describe, it, expect } from "vitest";
import { parsePageSize } from "../../../src/export/playwright-export.js";

describe("parsePageSize", () => {
  it("parses A4", () => {
    const { width, height } = parsePageSize("A4");
    expect(width).toBe(794);
    expect(height).toBe(1123);
  });

  it("parses Letter", () => {
    const { width, height } = parsePageSize("Letter");
    expect(width).toBe(816);
    expect(height).toBe(1056);
  });

  it("parses custom WxH", () => {
    const { width, height } = parsePageSize("800x600");
    expect(width).toBe(800);
    expect(height).toBe(600);
  });

  it("falls back to A4 for unknown format", () => {
    const { width, height } = parsePageSize("Tabloid");
    expect(width).toBe(794);
    expect(height).toBe(1123);
  });
});
