import { describe, it, expect } from "vitest";
import { runRender } from "../../src/cli/commands/render.js";
import { generateRequestId } from "../../src/cli/request-id.js";
import { DEFAULT_LAYOUT_OPTIONS } from "../../src/core/defaults.js";
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

  it("applies theme typography to rendered SVG text", async () => {
    const themePath = join(tmpDir, "theme-typography.json");
    writeFileSync(themePath, JSON.stringify({
      typography: {
        parentFont: { name: "Courier New", size: 17, style: "bold", color: "#111111" },
        leafFont: { name: "Courier New", size: 13, style: "", color: "#222222" },
      },
    }), "utf-8");

    const { envelope } = await runRender(
      join(fixturesDir, "nested-simple.json"),
      {},
      {},
      { outDir: tmpDir, svg: true, html: false, png: false, pdf: false, scale: 2, pageSize: "A4", pdfMargin: "10mm", dryRun: false },
      themePath, undefined, undefined,
      generateRequestId(),
    );
    expect(envelope.ok).toBe(true);

    const svg = readFileSync(join(tmpDir, "nested-simple.svg"), "utf-8");
    expect(svg).toContain('font-family="Courier New"');
    expect(svg).toContain('font-size="17"');
    expect(svg).toContain('font-size="13"');
    expect(svg).toContain('fill="#111111"');
    expect(svg).toContain('fill="#222222"');
  });

  it("uses theme spacing when CLI layout overrides are absent", async () => {
    const themePath = join(tmpDir, "theme-spacing.json");
    writeFileSync(themePath, JSON.stringify({
      spacing: {
        gap: 24,
        padding: 24,
        headerHeight: 80,
        rootGap: 60,
        viewMargin: 44,
      },
    }), "utf-8");

    const { envelope: baseline } = await runRender(
      join(fixturesDir, "nested-simple.json"),
      {},
      {},
      { outDir: tmpDir, svg: true, html: false, png: false, pdf: false, scale: 2, pageSize: "A4", pdfMargin: "10mm", dryRun: true },
      undefined, undefined, undefined,
      generateRequestId(),
    );

    const { envelope: themed } = await runRender(
      join(fixturesDir, "nested-simple.json"),
      {},
      {},
      { outDir: tmpDir, svg: true, html: false, png: false, pdf: false, scale: 2, pageSize: "A4", pdfMargin: "10mm", dryRun: true },
      themePath, undefined, undefined,
      generateRequestId(),
    );

    expect(themed.ok).toBe(true);
    expect(baseline.result?.layout_summary.total_width).not.toBe(themed.result?.layout_summary.total_width);
    expect(baseline.result?.layout_summary.total_height).not.toBe(themed.result?.layout_summary.total_height);
  });

  it("prioritizes explicit layout overrides over theme spacing", async () => {
    const themePath = join(tmpDir, "theme-spacing-priority.json");
    writeFileSync(themePath, JSON.stringify({
      spacing: {
        gap: 24,
        padding: 24,
        headerHeight: 80,
        rootGap: 60,
        viewMargin: 44,
      },
    }), "utf-8");

    const { envelope: baseline } = await runRender(
      join(fixturesDir, "nested-simple.json"),
      {},
      DEFAULT_LAYOUT_OPTIONS,
      { outDir: tmpDir, svg: true, html: false, png: false, pdf: false, scale: 2, pageSize: "A4", pdfMargin: "10mm", dryRun: true },
      undefined, undefined, undefined,
      generateRequestId(),
    );

    const { envelope: themedWithOverrides } = await runRender(
      join(fixturesDir, "nested-simple.json"),
      {},
      DEFAULT_LAYOUT_OPTIONS,
      { outDir: tmpDir, svg: true, html: false, png: false, pdf: false, scale: 2, pageSize: "A4", pdfMargin: "10mm", dryRun: true },
      themePath, undefined, undefined,
      generateRequestId(),
    );

    expect(themedWithOverrides.ok).toBe(true);
    expect(themedWithOverrides.result?.layout_summary.total_width)
      .toBe(baseline.result?.layout_summary.total_width);
    expect(themedWithOverrides.result?.layout_summary.total_height)
      .toBe(baseline.result?.layout_summary.total_height);
  });
});
