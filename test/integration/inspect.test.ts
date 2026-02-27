import { describe, it, expect } from "vitest";
import { runInspect } from "../../src/cli/commands/inspect.js";
import { generateRequestId } from "../../src/cli/request-id.js";
import { join } from "node:path";

const fixturesDir = join(process.cwd(), "test", "fixtures");

describe("inspect command", () => {
  it("detects nested schema", () => {
    const { envelope } = runInspect(join(fixturesDir, "nested-simple.json"), {}, generateRequestId());
    expect(envelope.ok).toBe(true);
    expect(envelope.result?.detected_schema).toBe("nested");
  });

  it("detects flat schema", () => {
    const { envelope } = runInspect(join(fixturesDir, "flat-by-id.json"), {}, generateRequestId());
    expect(envelope.ok).toBe(true);
    expect(envelope.result?.detected_schema).toBe("flat");
  });

  it("detects simple schema", () => {
    const { envelope } = runInspect(join(fixturesDir, "simple-list.json"), {}, generateRequestId());
    expect(envelope.ok).toBe(true);
    expect(envelope.result?.detected_schema).toBe("simple");
  });

  it("recomputes summary after --root filtering", () => {
    const baseline = runInspect(join(fixturesDir, "nested-simple.json"), {}, generateRequestId());
    const filtered = runInspect(
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
    const filtered = runInspect(
      join(fixturesDir, "flat-by-id.json"),
      { root: ["1"] },
      generateRequestId(),
    );
    expect(filtered.envelope.ok).toBe(true);
    expect(filtered.envelope.result?.model_summary.roots).toBe(1);
    expect(filtered.envelope.result?.model_summary.nodes).toBe(4);
  });

  it("handles wrapped object", () => {
    const { envelope } = runInspect(join(fixturesDir, "wrapped-object.json"), {}, generateRequestId());
    expect(envelope.ok).toBe(true);
    expect(envelope.result?.detected_schema).toBe("nested");
  });

  it("handles single root object", () => {
    const { envelope } = runInspect(join(fixturesDir, "single-root.json"), {}, generateRequestId());
    expect(envelope.ok).toBe(true);
    expect(envelope.result?.model_summary.roots).toBe(1);
  });

  it("handles custom fields", () => {
    const { envelope } = runInspect(join(fixturesDir, "custom-fields.json"), {}, generateRequestId());
    expect(envelope.ok).toBe(true);
    expect(envelope.result?.fields.name).toBe("title");
  });

  it("returns error for nonexistent file", () => {
    const { envelope, exitCode } = runInspect(join(fixturesDir, "nonexistent.json"), {}, generateRequestId());
    expect(envelope.ok).toBe(false);
    expect(exitCode).toBe(50);
  });

  it("returns error for empty input", () => {
    const { envelope } = runInspect(join(fixturesDir, "empty.json"), {}, generateRequestId());
    expect(envelope.ok).toBe(false);
  });
});
