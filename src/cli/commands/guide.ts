import { successEnvelope } from "../envelope.js";
import { DEFAULT_LAYOUT_OPTIONS, DEFAULT_THEME, SCHEMA_VERSION } from "../../core/defaults.js";
import { ErrorCode, exitCodeForError, isRetryable, suggestedAction } from "../errors.js";
import type { Envelope } from "../../core/types.js";

export function runGuide(requestId: string): { envelope: Envelope<unknown>; exitCode: number } {
  const errorCodes: Record<string, { exit_code: number; retryable: boolean; suggested_action: string }> = {};
  for (const code of Object.values(ErrorCode)) {
    errorCodes[code] = {
      exit_code: exitCodeForError(code as ErrorCode),
      retryable: isRetryable(code as ErrorCode),
      suggested_action: suggestedAction(code as ErrorCode),
    };
  }

  const result = {
    schema_version: SCHEMA_VERSION,
    commands: {
      "bcm.render": {
        description: "Full pipeline: import → layout → render → export",
        args: ["<input.json>"],
        mutates: true,
        flags: ["--outDir", "--svg", "--no-svg", "--html", "--png", "--pdf", "--scale", "--pageSize", "--pdfMargin", "--dry-run",
                "--nameField", "--descField", "--childrenField", "--parentField", "--idField", "--unwrap", "--stdin",
                "--maxDepth", "--sort", "--root", "--gap", "--padding", "--headerHeight", "--alignment", "--aspectRatio",
                "--rootGap", "--margin", "--leafHeight", "--minLeafWidth", "--maxLeafWidth", "--theme", "--font", "--fontSize",
                "--quiet", "--verbose"],
      },
      "bcm.validate": {
        description: "Import + validate; report issues; no artefacts",
        args: ["<input.json>"],
        mutates: false,
        flags: ["--nameField", "--descField", "--childrenField", "--parentField", "--idField", "--unwrap", "--stdin"],
      },
      "bcm.inspect": {
        description: "Detect schema fields and produce a structured summary",
        args: ["<input.json>"],
        mutates: false,
        flags: ["--nameField", "--descField", "--childrenField", "--parentField", "--idField", "--unwrap", "--stdin"],
      },
      "bcm.guide": {
        description: "Return full CLI schema, commands, flags, error codes, and examples as JSON",
        args: [],
        mutates: false,
        flags: [],
      },
    },
    error_codes: errorCodes,
    defaults: {
      layout: DEFAULT_LAYOUT_OPTIONS,
      theme: DEFAULT_THEME,
    },
  };

  return {
    envelope: successEnvelope("bcm.guide", result, { request_id: requestId }),
    exitCode: 0,
  };
}
