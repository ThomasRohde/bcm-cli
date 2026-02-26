import type { Envelope, InspectResult, ImportOptions } from "../../core/types.js";
import { successEnvelope, errorEnvelope } from "../envelope.js";
import { BcmAppError } from "../errors.js";
import { readInput } from "../../import/reader.js";
import { importJson } from "../../import/index.js";

export function runInspect(
  inputPath: string | undefined,
  importOpts: ImportOptions,
  requestId: string,
): { envelope: Envelope<InspectResult | null>; exitCode: number } {
  const start = Date.now();
  try {
    const raw = readInput(inputPath);
    const result = importJson(raw, importOpts);
    const duration_ms = Date.now() - start;

    return {
      envelope: successEnvelope<InspectResult>("bcm.inspect", {
        detected_schema: result.schema,
        fields: result.fields,
        model_summary: result.summary,
      }, {
        warnings: result.warnings,
        duration_ms,
        stages: { import_ms: duration_ms },
        request_id: requestId,
      }),
      exitCode: 0,
    };
  } catch (err: any) {
    return {
      envelope: errorEnvelope("bcm.inspect", err instanceof BcmAppError ? err : new Error(err.message), {
        duration_ms: Date.now() - start,
        request_id: requestId,
      }),
      exitCode: err instanceof BcmAppError ? err.exitCode : 90,
    };
  }
}
