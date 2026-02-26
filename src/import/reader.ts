import { readFileSync, existsSync } from "node:fs";
import { BcmAppError, ErrorCode } from "../cli/errors.js";

/**
 * Read input from a file path or stdin (fd 0).
 * When `filePath` is undefined, reads synchronously from stdin.
 */
export function readInput(filePath?: string): string {
  if (!filePath) {
    // Read from stdin (fd 0)
    try {
      const data = readFileSync(0, "utf-8");
      if (!data || !data.trim()) {
        throw new BcmAppError(
          ErrorCode.ERR_IO_READ,
          "No data received on stdin",
        );
      }
      return data;
    } catch (err: unknown) {
      if (err instanceof BcmAppError) throw err;
      const message =
        err instanceof Error ? err.message : "Unknown read error";
      throw new BcmAppError(
        ErrorCode.ERR_IO_READ,
        `Failed to read from stdin: ${message}`,
      );
    }
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
