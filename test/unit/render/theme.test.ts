import { describe, it, expect } from "vitest";
import { resolveTheme } from "../../../src/render/theme.js";
import { DEFAULT_THEME } from "../../../src/core/defaults.js";

describe("resolveTheme", () => {
  it("returns defaults when no overrides", () => {
    const theme = resolveTheme({});
    expect(theme.palette.leafFill).toBe(DEFAULT_THEME.palette.leafFill);
    expect(theme.typography.parentFont.name).toBe("Segoe UI");
  });

  it("CLI font override takes precedence", () => {
    const theme = resolveTheme({ font: "Inter" });
    expect(theme.typography.parentFont.name).toBe("Inter");
    expect(theme.typography.leafFont.name).toBe("Inter");
  });

  it("CLI fontSize override applies", () => {
    const theme = resolveTheme({ fontSize: 12 });
    expect(theme.typography.parentFont.size).toBe(12);
    expect(theme.typography.leafFont.size).toBe(12);
  });
});
