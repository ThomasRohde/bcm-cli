import { BcmAppError, ErrorCode } from "../cli/errors.js";

/**
 * Parse a JSON string into a value. Throws BcmAppError with
 * ERR_VALIDATION_JSON_PARSE on failure, including line/column if available.
 */
export function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (err: unknown) {
    const message =
      err instanceof SyntaxError ? err.message : "Invalid JSON";

    // Try to extract position info from the native error message
    // Typical format: "... at position 42" or "... at line 3 column 5"
    const posMatch = message.match(/position\s+(\d+)/i);
    const lineColMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);

    const details: Record<string, unknown> = { rawError: message };

    if (lineColMatch) {
      details.line = Number(lineColMatch[1]);
      details.column = Number(lineColMatch[2]);
    } else if (posMatch) {
      const pos = Number(posMatch[1]);
      details.position = pos;
      // Compute line/column from position
      const before = raw.slice(0, pos);
      const line = before.split("\n").length;
      const lastNewline = before.lastIndexOf("\n");
      const column = pos - lastNewline;
      details.line = line;
      details.column = column;
    }

    throw new BcmAppError(
      ErrorCode.ERR_VALIDATION_JSON_PARSE,
      `JSON parse error: ${message}`,
      details,
    );
  }
}
