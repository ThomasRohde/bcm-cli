import { describe, it, expect } from "vitest";
import { readInput } from "../../../src/import/reader.js";
import { join } from "node:path";

const fixturesDir = join(process.cwd(), "test", "fixtures");

describe("readInput", () => {
  it("reads a file successfully", () => {
    const content = readInput(join(fixturesDir, "nested-simple.json"));
    expect(content).toContain("name");
    expect(content.length).toBeGreaterThan(0);
  });

  it("throws ERR_IO_FILE_NOT_FOUND for missing file", () => {
    expect(() => readInput(join(fixturesDir, "nonexistent.json"))).toThrow(
      "File not found",
    );
  });

  it("throws ERR_IO_READ for invalid path characters", () => {
    // A path with null bytes triggers a read error
    expect(() => readInput("/dev/null\0bad")).toThrow();
  });
});
