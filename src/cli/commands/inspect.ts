import type { Envelope, InspectResult, ImportOptions } from "../../core/types.js";
import { successEnvelope, errorEnvelope } from "../envelope.js";
import { BcmAppError } from "../errors.js";
import { readInput } from "../../import/reader.js";
import { importData, filterRoots, summarizeModel } from "../../import/index.js";

export function runInspect(
  inputPath: string | undefined,
  importOpts: ImportOptions,
  requestId: string,
): { envelope: Envelope<InspectResult | null>; exitCode: number } {
  const start = Date.now();
  try {
    const raw = readInput(importOpts.stdin ? undefined : inputPath);
    const result = importData(raw, importOpts, importOpts.stdin ? undefined : inputPath);
    let roots = result.roots;
    const warnings = [...result.warnings];

    // --- Root filtering ---
    if (importOpts.root && importOpts.root.length > 0) {
      const { filtered, warnings: rootWarnings } = filterRoots(roots, importOpts.root);
      roots = filtered;
      warnings.push(...rootWarnings);
    }
    const summary = summarizeModel(roots);
    const duration_ms = Date.now() - start;

    return {
      envelope: successEnvelope<InspectResult>("bcm.inspect", {
        detected_schema: result.schema,
        fields: result.fields,
        model_summary: summary,
      }, {
        warnings,
        duration_ms,
        stages: { import_ms: duration_ms },
        request_id: requestId,
      }),
      exitCode: 0,
    };
  } catch (err: unknown) {
    const normalizedError = err instanceof Error ? err : new Error(String(err));
    return {
      envelope: errorEnvelope("bcm.inspect", err instanceof BcmAppError ? err : normalizedError, {
        duration_ms: Date.now() - start,
        request_id: requestId,
      }),
      exitCode: err instanceof BcmAppError ? err.exitCode : 90,
    };
  }
}
