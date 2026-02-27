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
import { BcmAppError } from "../errors.js";
import { readInput } from "../../import/reader.js";
import { importJson, filterRoots } from "../../import/index.js";
import { writeStderrVerbose } from "../output.js";
import { layoutTrees } from "../../layout/index.js";
import { renderSvg } from "../../render/svg-renderer.js";
import { wrapHtml } from "../../render/html-wrapper.js";
import { resolveTheme } from "../../render/theme.js";
import { atomicWrite } from "../../export/file-writer.js";
import { createStubMeasurer, createFontMeasurer } from "../../fonts/metrics.js";

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

    // --- Root filtering ---
    if (importOpts.root && importOpts.root.length > 0) {
      writeStderrVerbose(`[render] Filtering roots: ${importOpts.root.join(", ")}`);
      const { filtered, warnings: rootWarnings } = filterRoots(importResult.roots, importOpts.root);
      importResult.warnings.push(...rootWarnings);
      importResult.roots.length = 0;
      importResult.roots.push(...filtered);
    }
    stages.import_ms = Date.now() - importStart;

    // --- Validate ---
    const validateStart = Date.now();
    // Validation is already done inside importJson
    stages.validate_ms = Date.now() - validateStart;

    // --- Theme ---
    writeStderrVerbose("[render] Resolving theme...");
    const fontSizeOverride = fontSize ? parseInt(fontSize, 10) : undefined;
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

    // --- Layout ---
    writeStderrVerbose("[render] Computing layout...");
    const layoutStart = Date.now();
    const fontSizeNum = fontSizeOverride ?? theme.typography.leafFont.size;
    let measureText;
    const pkgRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
    const interFontPath = join(pkgRoot, "assets", "fonts", "Inter-Regular.ttf");
    if (existsSync(interFontPath)) {
      writeStderrVerbose("[render] Using Inter font metrics");
      measureText = await createFontMeasurer(interFontPath, fontSizeNum);
    } else {
      writeStderrVerbose("[render] Inter font not found, using stub measurer");
      measureText = createStubMeasurer();
    }
    const layoutResult = layoutTrees(importResult.roots, effectiveLayoutOpts, measureText);
    stages.layout_ms = Date.now() - layoutStart;

    // --- Render ---
    writeStderrVerbose("[render] Rendering SVG...");
    const renderStart = Date.now();
    const svg = renderSvg(layoutResult, theme);
    const html = wrapHtml(
      svg,
      layoutResult.totalWidth,
      layoutResult.totalHeight,
      theme,
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
          model_summary: importResult.summary,
          layout_summary: {
            total_width: layoutResult.totalWidth,
            total_height: layoutResult.totalHeight,
            leaf_size: layoutResult.leafSize,
          },
        },
        {
          warnings: importResult.warnings,
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
