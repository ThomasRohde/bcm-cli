import { statSync } from "node:fs";
import { join, basename, extname } from "node:path";
import type {
  Envelope,
  RenderResult,
  ImportOptions,
  ExportOptions,
  LayoutOptions,
  Artefact,
  StageMetrics,
} from "../../core/types.js";
import { successEnvelope, errorEnvelope } from "../envelope.js";
import { BcmAppError } from "../errors.js";
import { readInput } from "../../import/reader.js";
import { importJson } from "../../import/index.js";
import { layoutTrees } from "../../layout/index.js";
import { renderSvg } from "../../render/svg-renderer.js";
import { wrapHtml } from "../../render/html-wrapper.js";
import { resolveTheme } from "../../render/theme.js";
import { atomicWrite } from "../../export/file-writer.js";
import { createStubMeasurer } from "../../fonts/metrics.js";

export async function runRender(
  inputPath: string | undefined,
  importOpts: ImportOptions,
  layoutOpts: LayoutOptions,
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
    const raw = readInput(inputPath);
    const importResult = importJson(raw, importOpts);
    stages.import_ms = Date.now() - importStart;

    // --- Validate ---
    const validateStart = Date.now();
    // Validation is already done inside importJson
    stages.validate_ms = Date.now() - validateStart;

    // --- Theme ---
    const theme = resolveTheme(
      {
        font: fontName,
        fontSize: fontSize ? parseInt(fontSize, 10) : undefined,
      },
      themeFile,
    );

    // --- Layout ---
    const layoutStart = Date.now();
    const measureText = createStubMeasurer();
    const layoutResult = layoutTrees(importResult.roots, layoutOpts, measureText);
    stages.layout_ms = Date.now() - layoutStart;

    // --- Render ---
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
        await exportPdf(html, pdfPath, exportOpts.pageSize, exportOpts.pdfMargin);
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
