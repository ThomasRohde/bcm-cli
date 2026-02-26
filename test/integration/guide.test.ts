import { describe, it, expect } from "vitest";
import { runGuide } from "../../src/cli/commands/guide.js";
import { generateRequestId } from "../../src/cli/request-id.js";

describe("guide command", () => {
  it("returns success envelope", () => {
    const { envelope, exitCode } = runGuide(generateRequestId());
    expect(envelope.ok).toBe(true);
    expect(exitCode).toBe(0);
  });

  it("contains all commands", () => {
    const { envelope } = runGuide(generateRequestId());
    const result = envelope.result as any;
    expect(result.commands).toHaveProperty("bcm.render");
    expect(result.commands).toHaveProperty("bcm.validate");
    expect(result.commands).toHaveProperty("bcm.inspect");
    expect(result.commands).toHaveProperty("bcm.guide");
  });

  it("contains error codes", () => {
    const { envelope } = runGuide(generateRequestId());
    const result = envelope.result as any;
    expect(result.error_codes).toHaveProperty("ERR_IO_FILE_NOT_FOUND");
    expect(result.error_codes).toHaveProperty("ERR_VALIDATION_CYCLE");
    expect(result.error_codes).toHaveProperty("ERR_INTERNAL");
  });

  it("contains defaults", () => {
    const { envelope } = runGuide(generateRequestId());
    const result = envelope.result as any;
    expect(result.defaults.layout).toHaveProperty("gap", 8);
    expect(result.defaults.layout).toHaveProperty("padding", 12);
    expect(result.defaults.theme).toHaveProperty("palette");
  });

  it("contains schema_version", () => {
    const { envelope } = runGuide(generateRequestId());
    const result = envelope.result as any;
    expect(result.schema_version).toBe("1.0");
  });

  it("contains examples array", () => {
    const { envelope } = runGuide(generateRequestId());
    const result = envelope.result as any;
    expect(result.examples).toBeDefined();
    expect(result.examples.length).toBeGreaterThanOrEqual(6);
    expect(result.examples[0]).toHaveProperty("command");
    expect(result.examples[0]).toHaveProperty("description");
  });

  it("has typed flag metadata on commands", () => {
    const { envelope } = runGuide(generateRequestId());
    const result = envelope.result as any;
    const renderFlags = result.commands["bcm.render"].flags;
    expect(renderFlags["--outDir"]).toHaveProperty("type", "string");
    expect(renderFlags["--outDir"]).toHaveProperty("default", ".");
    expect(renderFlags["--outDir"]).toHaveProperty("description");
    expect(renderFlags["--svg"]).toHaveProperty("type", "boolean");
    expect(renderFlags["--sort"]).toHaveProperty("choices");
  });
});
