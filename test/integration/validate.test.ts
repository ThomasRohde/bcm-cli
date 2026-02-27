import { describe, it, expect } from "vitest";
import { runValidate } from "../../src/cli/commands/validate.js";
import { generateRequestId } from "../../src/cli/request-id.js";
import { join } from "node:path";

const fixturesDir = join(process.cwd(), "test", "fixtures");

describe("validate command", () => {
  it("validates correct nested input", () => {
    const { envelope, exitCode } = runValidate(join(fixturesDir, "nested-simple.json"), {}, generateRequestId());
    expect(envelope.ok).toBe(true);
    expect(envelope.result?.valid).toBe(true);
    expect(exitCode).toBe(0);
  });

  it("validates flat-by-id input", () => {
    const { envelope } = runValidate(join(fixturesDir, "flat-by-id.json"), {}, generateRequestId());
    expect(envelope.ok).toBe(true);
    expect(envelope.result?.valid).toBe(true);
  });

  it("recomputes summary after --root filtering", () => {
    const baseline = runValidate(join(fixturesDir, "nested-simple.json"), {}, generateRequestId());
    const filtered = runValidate(
      join(fixturesDir, "nested-simple.json"),
      { root: ["Customer Management"] },
      generateRequestId(),
    );
    expect(filtered.envelope.ok).toBe(true);
    expect(filtered.envelope.result?.model_summary.roots).toBe(1);
    expect(filtered.envelope.result?.model_summary.nodes).toBeLessThan(
      baseline.envelope.result?.model_summary.nodes ?? Number.POSITIVE_INFINITY,
    );
  });

  it("filters flat schema roots by source ID", () => {
    const filtered = runValidate(
      join(fixturesDir, "flat-by-id.json"),
      { root: ["1"] },
      generateRequestId(),
    );
    expect(filtered.envelope.ok).toBe(true);
    expect(filtered.envelope.result?.model_summary.roots).toBe(1);
    expect(filtered.envelope.result?.model_summary.nodes).toBe(4);
  });

  it("returns error for missing file", () => {
    const { exitCode } = runValidate(join(fixturesDir, "nonexistent.json"), {}, generateRequestId());
    expect(exitCode).toBe(50);
  });

  it("reports node counts correctly", () => {
    const { envelope } = runValidate(join(fixturesDir, "nested-simple.json"), {}, generateRequestId());
    expect(envelope.result?.model_summary.nodes).toBe(7);
    expect(envelope.result?.model_summary.roots).toBe(2);
    expect(envelope.result?.model_summary.max_depth).toBe(1);
  });
});
