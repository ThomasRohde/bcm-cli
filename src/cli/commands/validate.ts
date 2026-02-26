import type { Envelope, ValidateResult, ImportOptions } from "../../core/types.js";
import { successEnvelope, errorEnvelope } from "../envelope.js";
import { BcmAppError } from "../errors.js";
import { readInput } from "../../import/reader.js";
import { importJson } from "../../import/index.js";

export function runValidate(
  inputPath: string | undefined,
  importOpts: ImportOptions,
  requestId: string,
): { envelope: Envelope<ValidateResult | null>; exitCode: number } {
  const start = Date.now();
  try {
    const raw = readInput(inputPath);
    const result = importJson(raw, importOpts);
    const duration_ms = Date.now() - start;

    // Check if import produced validation errors in warnings
    const hasValidationErrors = result.warnings.some(w =>
      w.code.startsWith("ERR_VALIDATION_CYCLE") ||
      w.code.startsWith("ERR_VALIDATION_DUPLICATE")
    );

    return {
      envelope: successEnvelope<ValidateResult>("bcm.validate", {
        valid: !hasValidationErrors,
        model_summary: result.summary,
      }, {
        warnings: result.warnings,
        duration_ms,
        stages: { import_ms: duration_ms, validate_ms: 0 },
        request_id: requestId,
      }),
      exitCode: 0,
    };
  } catch (err: any) {
    return {
      envelope: errorEnvelope("bcm.validate", err instanceof BcmAppError ? err : new Error(err.message), {
        duration_ms: Date.now() - start,
        request_id: requestId,
      }),
      exitCode: err instanceof BcmAppError ? err.exitCode : 90,
    };
  }
}
