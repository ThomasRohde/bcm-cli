import { describe, it, expect } from "vitest";
import { runRender } from "../../src/cli/commands/render.js";
import { generateRequestId } from "../../src/cli/request-id.js";
import { DEFAULT_LAYOUT_OPTIONS } from "../../src/core/defaults.js";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const fixturesDir = join(process.cwd(), "test", "fixtures");
const tmpDir = join(process.cwd(), "test", ".tmp-render");

describe("render command", () => {
  beforeEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
  });

  it("renders nested-simple to SVG", async () => {
    const { envelope, exitCode } = await runRender(
      join(fixturesDir, "nested-simple.json"),
      {},
      DEFAULT_LAYOUT_OPTIONS,
      { outDir: tmpDir, svg: true, html: false, png: false, pdf: false, scale: 2, pageSize: "A4", pdfMargin: "10mm", dryRun: false },
      undefined, undefined, undefined,
      generateRequestId(),
    );
    expect(exitCode).toBe(0);
    expect(envelope.ok).toBe(true);
    expect(envelope.result?.artefacts).toHaveLength(1);
    expect(envelope.result?.artefacts[0].type).toBe("svg");
    expect(existsSync(join(tmpDir, "nested-simple.svg"))).toBe(true);
  });

  it("renders with SVG and HTML output", async () => {
    const { envelope } = await runRender(
      join(fixturesDir, "nested-deep.json"),
      {},
      DEFAULT_LAYOUT_OPTIONS,
      { outDir: tmpDir, svg: true, html: true, png: false, pdf: false, scale: 2, pageSize: "A4", pdfMargin: "10mm", dryRun: false },
      undefined, undefined, undefined,
      generateRequestId(),
    );
    expect(envelope.ok).toBe(true);
    expect(envelope.result?.artefacts).toHaveLength(2);
    expect(existsSync(join(tmpDir, "nested-deep.svg"))).toBe(true);
    expect(existsSync(join(tmpDir, "nested-deep.html"))).toBe(true);
  });

  it("dry-run writes no files", async () => {
    const { envelope } = await runRender(
      join(fixturesDir, "nested-simple.json"),
      {},
      DEFAULT_LAYOUT_OPTIONS,
      { outDir: tmpDir, svg: true, html: true, png: false, pdf: false, scale: 2, pageSize: "A4", pdfMargin: "10mm", dryRun: true },
      undefined, undefined, undefined,
      generateRequestId(),
    );
    expect(envelope.ok).toBe(true);
    expect(envelope.result?.artefacts).toHaveLength(0);
  });

  it("returns error for missing input", async () => {
    const { exitCode } = await runRender(
      join(fixturesDir, "nonexistent.json"),
      {},
      DEFAULT_LAYOUT_OPTIONS,
      { outDir: tmpDir, svg: true, html: false, png: false, pdf: false, scale: 2, pageSize: "A4", pdfMargin: "10mm", dryRun: false },
      undefined, undefined, undefined,
      generateRequestId(),
    );
    expect(exitCode).toBe(50);
  });

  it("renders flat-by-id fixture", async () => {
    const { envelope } = await runRender(
      join(fixturesDir, "flat-by-id.json"),
      {},
      DEFAULT_LAYOUT_OPTIONS,
      { outDir: tmpDir, svg: true, html: false, png: false, pdf: false, scale: 2, pageSize: "A4", pdfMargin: "10mm", dryRun: false },
      undefined, undefined, undefined,
      generateRequestId(),
    );
    expect(envelope.ok).toBe(true);
    expect(envelope.result?.model_summary.roots).toBe(2);
  });
});
