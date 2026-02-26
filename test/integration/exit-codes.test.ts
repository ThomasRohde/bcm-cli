import { describe, it, expect } from "vitest";
import { runValidate } from "../../src/cli/commands/validate.js";
import { generateRequestId } from "../../src/cli/request-id.js";
import { join } from "node:path";

const fixturesDir = join(process.cwd(), "test", "fixtures");

describe("exit codes", () => {
  it("exit 10 for cycle detection", () => {
    const { exitCode } = runValidate(join(fixturesDir, "cycle.json"), {}, generateRequestId());
    expect(exitCode).toBe(10);
  });

  it("exit 10 for duplicate IDs", () => {
    const { exitCode } = runValidate(join(fixturesDir, "duplicate-ids.json"), {}, generateRequestId());
    expect(exitCode).toBe(10);
  });

  it("exit 10 for empty input", () => {
    const { exitCode } = runValidate(join(fixturesDir, "empty.json"), {}, generateRequestId());
    expect(exitCode).toBe(10);
  });

  it("exit 10 for no-name-field", () => {
    const { exitCode } = runValidate(join(fixturesDir, "no-name-field.json"), {}, generateRequestId());
    expect(exitCode).toBe(10);
  });

  it("exit 50 for file not found", () => {
    const { exitCode } = runValidate(join(fixturesDir, "nonexistent.json"), {}, generateRequestId());
    expect(exitCode).toBe(50);
  });

  it("exit 0 for valid input", () => {
    const { exitCode } = runValidate(join(fixturesDir, "nested-simple.json"), {}, generateRequestId());
    expect(exitCode).toBe(0);
  });
});
