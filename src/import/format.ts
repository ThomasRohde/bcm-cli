/**
 * Format detection by file extension.
 */

export type InputFormat = "json" | "csv" | "tsv";

/**
 * Detect input format from the file extension.
 * Returns "json" for undefined (stdin) or unrecognised extensions.
 * Case-insensitive.
 */
export function detectFormat(filePath: string | undefined): InputFormat {
  if (filePath === undefined) return "json";

  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  switch (ext) {
    case ".csv":
      return "csv";
    case ".tsv":
    case ".tab":
      return "tsv";
    default:
      return "json";
  }
}
