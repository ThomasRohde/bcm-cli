import { describe, it, expect, afterEach } from "vitest";
import { atomicWrite } from "../../../src/export/file-writer.js";
import { readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const tmpDir = join(process.cwd(), "test", ".tmp-writer");

describe("atomicWrite", () => {
  beforeEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
  });

  it("creates a file with correct content", () => {
    const path = join(tmpDir, "test.txt");
    atomicWrite(path, "hello world");
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf-8")).toBe("hello world");
  });

  it("creates intermediate directories", () => {
    const path = join(tmpDir, "sub", "deep", "test.txt");
    atomicWrite(path, "nested");
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf-8")).toBe("nested");
  });

  it("overwrites existing files", () => {
    const path = join(tmpDir, "overwrite.txt");
    atomicWrite(path, "first");
    atomicWrite(path, "second");
    expect(readFileSync(path, "utf-8")).toBe("second");
  });
});
