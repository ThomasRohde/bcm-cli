import { readFileSync, existsSync } from "node:fs";
import { BcmAppError, ErrorCode } from "../cli/errors.js";

/**
 * Read input from a file path. If no path is provided, throws an error
 * indicating stdin is not yet supported.
 */
export function readInput(filePath?: string): string {
  if (!filePath) {
    throw new BcmAppError(
      ErrorCode.ERR_IO_READ,
      "stdin not yet supported — please provide a file path",
    );
  }

  if (!existsSync(filePath)) {
    throw new BcmAppError(
      ErrorCode.ERR_IO_FILE_NOT_FOUND,
      `File not found: ${filePath}`,
      { path: filePath },
    );
  }

  try {
    return readFileSync(filePath, "utf-8");
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown read error";
    throw new BcmAppError(
      ErrorCode.ERR_IO_READ,
      `Failed to read file: ${message}`,
      { path: filePath },
    );
  }
}
