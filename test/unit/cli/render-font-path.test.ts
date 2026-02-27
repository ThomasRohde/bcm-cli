import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolveBundledInterFontPath } from "../../../src/cli/commands/render.js";

describe("resolveBundledInterFontPath", () => {
  it("resolves Inter font when bundled assets are present", () => {
    const path = resolveBundledInterFontPath();
    expect(path).not.toBeNull();
    expect(existsSync(path!)).toBe(true);
  });
});
