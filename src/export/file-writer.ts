import { writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { BcmAppError, ErrorCode } from "../cli/errors.js";

export function atomicWrite(filePath: string, content: string | Buffer): void {
  try {
    mkdirSync(dirname(filePath), { recursive: true });
    const tmpPath = join(
      dirname(filePath),
      `.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`,
    );
    writeFileSync(tmpPath, content);
    renameSync(tmpPath, filePath);
  } catch (err: any) {
    throw new BcmAppError(ErrorCode.ERR_IO_WRITE, `Failed to write ${filePath}: ${err.message}`, {
      path: filePath,
    });
  }
}
