import type { Envelope, ValidateResult, ImportOptions } from "../../core/types.js";
import { successEnvelope, errorEnvelope } from "../envelope.js";
import { BcmAppError } from "../errors.js";
import { readInput } from "../../import/reader.js";
import { importJson, filterRoots, summarizeModel } from "../../import/index.js";

export function runValidate(
  inputPath: string | undefined,
  importOpts: ImportOptions,
  requestId: string,
): { envelope: Envelope<ValidateResult | null>; exitCode: number } {
  const start = Date.now();
  try {
    const raw = readInput(importOpts.stdin ? undefined : inputPath);
    const result = importJson(raw, importOpts);
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

    // Import-level validation errors are hard failures. This only catches
    // warning-based validation codes if such warnings are introduced.
    const hasValidationErrors = warnings.some((w) =>
      w.code.startsWith("ERR_VALIDATION_CYCLE") ||
      w.code.startsWith("ERR_VALIDATION_DUPLICATE")
    );

    return {
      envelope: successEnvelope<ValidateResult>("bcm.validate", {
        valid: !hasValidationErrors,
        model_summary: summary,
      }, {
        warnings,
        duration_ms,
        stages: { import_ms: duration_ms, validate_ms: 0 },
        request_id: requestId,
      }),
      exitCode: 0,
    };
  } catch (err: unknown) {
    const normalizedError = err instanceof Error ? err : new Error(String(err));
    return {
      envelope: errorEnvelope("bcm.validate", err instanceof BcmAppError ? err : normalizedError, {
        duration_ms: Date.now() - start,
        request_id: requestId,
      }),
      exitCode: err instanceof BcmAppError ? err.exitCode : 90,
    };
  }
}
