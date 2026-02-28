/**
 * Dependency-free CSV/TSV parser with level-to-parent inference.
 */

import { BcmAppError, ErrorCode } from "../cli/errors.js";

export type CsvDialect = "csv" | "tsv";

// ---------------------------------------------------------------------------
// Value coercion
// ---------------------------------------------------------------------------

/**
 * Convert numeric strings to numbers and boolean strings to booleans.
 * All other values are returned as-is.
 */
export function coerceValue(value: string): string | number | boolean {
  if (value === "") return value;

  // Booleans (case-insensitive)
  const lower = value.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;

  // Numbers — only if the entire trimmed string is numeric
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }

  return value;
}

// ---------------------------------------------------------------------------
// CSV/TSV state-machine parser
// ---------------------------------------------------------------------------

/**
 * Parse a CSV or TSV string into an array of header-keyed objects.
 *
 * Handles:
 * - Quoted fields (double-quote delimited)
 * - Embedded commas/tabs and newlines inside quotes
 * - Escaped quotes via `""`
 * - UTF-8 BOM stripping
 * - CRLF / LF / CR line endings
 * - Blank row skipping
 */
export function parseCsv(
  raw: string,
  dialect: CsvDialect = "csv",
): Record<string, string | number | boolean>[] {
  // Strip UTF-8 BOM
  let input = raw;
  if (input.charCodeAt(0) === 0xfeff) {
    input = input.slice(1);
  }

  // Normalize line endings to LF
  input = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const delimiter = dialect === "tsv" ? "\t" : ",";
  const rows = parseRows(input, delimiter);

  if (rows.length === 0) {
    throw new BcmAppError(
      ErrorCode.ERR_VALIDATION_CSV_PARSE,
      "CSV input is empty — no rows found",
    );
  }

  // First row is headers
  const headers = rows[0].map((h) => h.trim());

  if (headers.length === 0 || headers.every((h) => h === "")) {
    throw new BcmAppError(
      ErrorCode.ERR_VALIDATION_CSV_PARSE,
      "CSV headers are empty",
    );
  }

  // Check for duplicate headers
  const seen = new Set<string>();
  for (const h of headers) {
    if (h === "") continue;
    if (seen.has(h)) {
      throw new BcmAppError(
        ErrorCode.ERR_VALIDATION_CSV_PARSE,
        `Duplicate CSV header: "${h}"`,
        { header: h },
      );
    }
    seen.add(h);
  }

  // Convert data rows to objects
  const result: Record<string, string | number | boolean>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    // Skip blank rows (all cells empty)
    if (row.every((cell) => cell.trim() === "")) continue;

    const obj: Record<string, string | number | boolean> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      if (header === "") continue;
      const rawValue = j < row.length ? row[j].trim() : "";
      obj[header] = coerceValue(rawValue);
    }
    result.push(obj);
  }

  if (result.length === 0) {
    throw new BcmAppError(
      ErrorCode.ERR_VALIDATION_CSV_PARSE,
      "CSV input contains headers but no data rows",
    );
  }

  return result;
}

/**
 * State-machine row parser. Returns an array of rows, each row an array of
 * raw string fields.
 */
function parseRows(input: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < input.length && input[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        row.push(field);
        field = "";
        i++;
      } else if (ch === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Push final field/row if there's content
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Level-to-parent inference
// ---------------------------------------------------------------------------

/**
 * Parse a level value into a numeric depth. Accepts:
 * - Numeric values: 1, 2, 3
 * - Prefixed values: L1, L2, L3 (case-insensitive)
 */
function parseLevelValue(value: string | number | boolean): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return null;

  const str = String(value).trim();
  // Try "L1", "L2", "L3" pattern
  const prefixMatch = str.match(/^[Ll](\d+)$/);
  if (prefixMatch) return parseInt(prefixMatch[1], 10);

  // Try plain number
  const num = parseInt(str, 10);
  if (Number.isFinite(num) && num > 0) return num;

  return null;
}

/**
 * Convert a level column into synthetic parent references using a stack.
 *
 * For each row, look at the level value and determine the parent by finding
 * the most recent row at (level - 1) in a stack. Adds an `__inferred_parent`
 * field to each row with the parent's ID/name.
 */
export function inferParentsFromLevels(
  rows: Record<string, string | number | boolean>[],
  levelField: string,
  nameField: string,
  idField: string | null,
): void {
  // Stack: index by level → most recent node identifier at that level
  const stack: Map<number, string> = new Map();

  for (const row of rows) {
    const levelRaw = row[levelField];
    const level = parseLevelValue(levelRaw);
    if (level === null) continue;

    const nodeId = idField && row[idField] != null
      ? String(row[idField])
      : String(row[nameField]);

    // Parent is the most recent node at (level - 1)
    if (level > 1) {
      const parentId = stack.get(level - 1);
      if (parentId !== undefined) {
        row["__inferred_parent"] = parentId;
      }
    }

    // Update stack: this node becomes the most recent at its level
    stack.set(level, nodeId);

    // Clear deeper levels (they're no longer valid parents)
    for (const [key] of stack) {
      if (key > level) stack.delete(key);
    }
  }
}
