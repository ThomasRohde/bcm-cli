import { statSync, existsSync } from "node:fs";
import { join, basename, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Envelope,
  RenderResult,
  ImportOptions,
  ExportOptions,
  LayoutOptions,
  Artefact,
  StageMetrics,
} from "../../core/types.js";
import { DEFAULT_LAYOUT_OPTIONS } from "../../core/defaults.js";
import { successEnvelope, errorEnvelope } from "../envelope.js";
import { BcmAppError, ErrorCode } from "../errors.js";
import { readInput } from "../../import/reader.js";
import { importJson, filterRoots, summarizeModel } from "../../import/index.js";
import { writeStderrVerbose } from "../output.js";
import { layoutTrees } from "../../layout/index.js";
import { renderSvg } from "../../render/svg-renderer.js";
import { wrapHtml, type HtmlNodeMeta } from "../../render/html-wrapper.js";
import { resolveTheme } from "../../render/theme.js";
import { atomicWrite } from "../../export/file-writer.js";
import { createStubMeasurer, createFontMeasurer } from "../../fonts/metrics.js";

function parseFontSizeOverride(fontSize: string | undefined): number | undefined {
  if (fontSize === undefined) return undefined;
  const parsed = Number.parseInt(fontSize, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new BcmAppError(
      ErrorCode.ERR_VALIDATION_OPTION,
      `Invalid value for --fontSize: "${fontSize}" (expected a positive integer)`,
      { option: "fontSize", value: fontSize },
    );
  }
  return parsed;
}

function assertFiniteNumber(
  value: number,
  optionName: string,
  opts?: { min?: number; integer?: boolean },
): void {
  if (!Number.isFinite(value)) {
    throw new BcmAppError(
      ErrorCode.ERR_VALIDATION_OPTION,
      `Invalid value for --${optionName}: expected a number`,
      { option: optionName, value },
    );
  }
  if (opts?.integer && !Number.isInteger(value)) {
    throw new BcmAppError(
      ErrorCode.ERR_VALIDATION_OPTION,
      `Invalid value for --${optionName}: expected an integer`,
      { option: optionName, value },
    );
  }
  if (opts?.min !== undefined && value < opts.min) {
    throw new BcmAppError(
      ErrorCode.ERR_VALIDATION_OPTION,
      `Invalid value for --${optionName}: must be >= ${opts.min}`,
      { option: optionName, value, min: opts.min },
    );
  }
}

function validateLayoutOptions(options: LayoutOptions): void {
  assertFiniteNumber(options.gap, "gap", { min: 0, integer: true });
  assertFiniteNumber(options.padding, "padding", { min: 0, integer: true });
  assertFiniteNumber(options.headerHeight, "headerHeight", { min: 1, integer: true });
  assertFiniteNumber(options.rootGap, "rootGap", { min: 0, integer: true });
  assertFiniteNumber(options.viewMargin, "margin", { min: 0, integer: true });
  assertFiniteNumber(options.aspectRatio, "aspectRatio", { min: Number.EPSILON });
  assertFiniteNumber(options.maxDepth, "maxDepth", { min: -1, integer: true });
  assertFiniteNumber(options.minLeafWidth, "minLeafWidth", { min: 1, integer: true });
  assertFiniteNumber(options.maxLeafWidth, "maxLeafWidth", { min: 1, integer: true });
  assertFiniteNumber(options.leafHeight, "leafHeight", { min: 1, integer: true });
  if (options.maxLeafWidth < options.minLeafWidth) {
    throw new BcmAppError(
      ErrorCode.ERR_VALIDATION_OPTION,
      "Invalid leaf width range: --maxLeafWidth must be >= --minLeafWidth",
      {
        minLeafWidth: options.minLeafWidth,
        maxLeafWidth: options.maxLeafWidth,
      },
    );
  }
}

function validateExportOptions(options: ExportOptions): void {
  assertFiniteNumber(options.scale, "scale", { min: Number.EPSILON });
}

export function resolveBundledInterFontPath(
  moduleUrl: string = import.meta.url,
): string | null {
  const moduleDir = dirname(fileURLToPath(moduleUrl));
  const candidates = [
    join(moduleDir, "assets", "fonts", "Inter-Regular.ttf"),
    join(moduleDir, "..", "assets", "fonts", "Inter-Regular.ttf"),
    join(moduleDir, "..", "..", "assets", "fonts", "Inter-Regular.ttf"),
    join(moduleDir, "..", "..", "..", "assets", "fonts", "Inter-Regular.ttf"),
    join(process.cwd(), "assets", "fonts", "Inter-Regular.ttf"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export async function runRender(
  inputPath: string | undefined,
  importOpts: ImportOptions,
  layoutOpts: Partial<LayoutOptions>,
  exportOpts: ExportOptions,
  themeFile: string | undefined,
  fontName: string | undefined,
  fontSize: string | undefined,
  requestId: string,
): Promise<{ envelope: Envelope<RenderResult | null>; exitCode: number }> {
  const start = Date.now();
  const stages: StageMetrics = {};
  try {
    // --- Import ---
    const importStart = Date.now();
    writeStderrVerbose("[render] Reading input...");
    const raw = readInput(importOpts.stdin ? undefined : inputPath);
    writeStderrVerbose("[render] Parsing and normalizing...");
    const importResult = importJson(raw, importOpts);
    let roots = importResult.roots;
    const warnings = [...importResult.warnings];

    // --- Root filtering ---
    if (importOpts.root && importOpts.root.length > 0) {
      writeStderrVerbose(`[render] Filtering roots: ${importOpts.root.join(", ")}`);
      const { filtered, warnings: rootWarnings } = filterRoots(roots, importOpts.root);
      roots = filtered;
      warnings.push(...rootWarnings);
    }
    const modelSummary = summarizeModel(roots);
    stages.import_ms = Date.now() - importStart;

    // --- Validate ---
    const validateStart = Date.now();
    // Validation is already done inside importJson
    stages.validate_ms = Date.now() - validateStart;

    // --- Theme ---
    writeStderrVerbose("[render] Resolving theme...");
    const fontSizeOverride = parseFontSizeOverride(fontSize);
    const theme = resolveTheme(
      {
        font: fontName,
        fontSize: fontSizeOverride,
      },
      themeFile,
    );

    const effectiveLayoutOpts: LayoutOptions = {
      ...DEFAULT_LAYOUT_OPTIONS,
      ...theme.spacing,
      ...layoutOpts,
    };
    validateLayoutOptions(effectiveLayoutOpts);
    validateExportOptions(exportOpts);

    // --- Layout ---
    writeStderrVerbose("[render] Computing layout...");
    const layoutStart = Date.now();
    const fontSizeNum = fontSizeOverride ?? theme.typography.leafFont.size;
    let measureText;
    const interFontPath = resolveBundledInterFontPath();
    if (interFontPath) {
      writeStderrVerbose("[render] Using Inter font metrics");
      measureText = await createFontMeasurer(interFontPath, fontSizeNum);
    } else {
      writeStderrVerbose("[render] Inter font not found, using stub measurer");
      measureText = createStubMeasurer();
    }
    const layoutResult = layoutTrees(roots, effectiveLayoutOpts, measureText);
    stages.layout_ms = Date.now() - layoutStart;

    // --- Render ---
    writeStderrVerbose("[render] Rendering SVG...");
    const renderStart = Date.now();
    const svg = renderSvg(layoutResult, theme);
    const htmlNodes: HtmlNodeMeta[] = layoutResult.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      description: node.description,
      depth: node.depth,
      isLeaf: node._effectiveLeaf,
      x: node.position.x,
      y: node.position.y,
      w: node.size.w,
      h: node.size.h,
    }));
    const html = wrapHtml(
      svg,
      layoutResult.totalWidth,
      layoutResult.totalHeight,
      theme,
      htmlNodes,
    );
    stages.render_ms = Date.now() - renderStart;

    // --- Export ---
    writeStderrVerbose("[render] Exporting artefacts...");
    const exportStart = Date.now();
    const artefacts: Artefact[] = [];
    const baseName = inputPath
      ? basename(inputPath, extname(inputPath))
      : "capability-map";

    if (!exportOpts.dryRun) {
      if (exportOpts.svg) {
        const svgPath = join(exportOpts.outDir, `${baseName}.svg`);
        atomicWrite(svgPath, svg);
        artefacts.push({
          type: "svg",
          path: svgPath,
          bytes: Buffer.byteLength(svg, "utf-8"),
        });
      }

      if (exportOpts.html) {
        const htmlPath = join(exportOpts.outDir, `${baseName}.html`);
        atomicWrite(htmlPath, html);
        artefacts.push({
          type: "html",
          path: htmlPath,
          bytes: Buffer.byteLength(html, "utf-8"),
        });
      }

      if (exportOpts.png) {
        const pngPath = join(exportOpts.outDir, `${baseName}.png`);
        const { exportPng } = await import("../../export/playwright-export.js");
        await exportPng(
          html,
          pngPath,
          layoutResult.totalWidth,
          layoutResult.totalHeight,
          exportOpts.scale,
        );
        artefacts.push({
          type: "png",
          path: pngPath,
          bytes: statSync(pngPath).size,
        });
      }

      if (exportOpts.pdf) {
        const pdfPath = join(exportOpts.outDir, `${baseName}.pdf`);
        const { exportPdf } = await import("../../export/playwright-export.js");
        await exportPdf(html, pdfPath, exportOpts.pageSize, exportOpts.pdfMargin, layoutResult.totalWidth, layoutResult.totalHeight);
        artefacts.push({
          type: "pdf",
          path: pdfPath,
          bytes: statSync(pdfPath).size,
        });
      }
    }
    stages.export_ms = Date.now() - exportStart;

    const duration_ms = Date.now() - start;
    return {
      envelope: successEnvelope<RenderResult>(
        "bcm.render",
        {
          artefacts,
          model_summary: modelSummary,
          layout_summary: {
            total_width: layoutResult.totalWidth,
            total_height: layoutResult.totalHeight,
            leaf_size: layoutResult.leafSize,
          },
        },
        {
          warnings,
          duration_ms,
          stages,
          request_id: requestId,
        },
      ),
      exitCode: 0,
    };
  } catch (err: unknown) {
    const error =
      err instanceof BcmAppError
        ? err
        : new Error(err instanceof Error ? err.message : String(err));
    return {
      envelope: errorEnvelope("bcm.render", error, {
        duration_ms: Date.now() - start,
        stages,
        request_id: requestId,
      }),
      exitCode: err instanceof BcmAppError ? err.exitCode : 90,
    };
  }
}
