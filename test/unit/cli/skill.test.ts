import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runSkill } from "../../../src/cli/commands/skill.js";

describe("skill command", () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it("writes to stdout", () => {
    runSkill();
    expect(writeSpy).toHaveBeenCalledOnce();
    expect(typeof writeSpy.mock.calls[0][0]).toBe("string");
  });

  it("contains expected SKILL.md sections", () => {
    runSkill();
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain("## Purpose");
    expect(output).toContain("## Capability description template");
    expect(output).toContain("## Agentic workflow");
  });

  it("contains MECE audit section", () => {
    runSkill();
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain("## MECE audit");
  });

  it("contains common anti-patterns", () => {
    runSkill();
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain("## Common anti-patterns");
  });
});
