import { describe, it, expect } from "vitest";
import { ErrorCode, exitCodeForError, isRetryable, suggestedAction, BcmAppError } from "../../../src/cli/errors.js";

describe("errors", () => {
  it("maps validation errors to exit code 10", () => {
    expect(exitCodeForError(ErrorCode.ERR_VALIDATION_JSON_PARSE)).toBe(10);
    expect(exitCodeForError(ErrorCode.ERR_VALIDATION_CYCLE)).toBe(10);
    expect(exitCodeForError(ErrorCode.ERR_VALIDATION_DUPLICATE_ID)).toBe(10);
  });

  it("maps I/O errors to exit code 50", () => {
    expect(exitCodeForError(ErrorCode.ERR_IO_FILE_NOT_FOUND)).toBe(50);
    expect(exitCodeForError(ErrorCode.ERR_IO_READ)).toBe(50);
    expect(exitCodeForError(ErrorCode.ERR_IO_WRITE)).toBe(50);
  });

  it("maps layout errors to exit code 20", () => {
    expect(exitCodeForError(ErrorCode.ERR_LAYOUT_FAILED)).toBe(20);
  });

  it("maps export errors to exit code 30", () => {
    expect(exitCodeForError(ErrorCode.ERR_EXPORT_PLAYWRIGHT)).toBe(30);
    expect(exitCodeForError(ErrorCode.ERR_EXPORT_BROWSER_LAUNCH)).toBe(30);
  });

  it("maps internal errors to exit code 90", () => {
    expect(exitCodeForError(ErrorCode.ERR_INTERNAL)).toBe(90);
  });

  it("identifies retryable errors", () => {
    expect(isRetryable(ErrorCode.ERR_IO_READ)).toBe(true);
    expect(isRetryable(ErrorCode.ERR_IO_WRITE)).toBe(true);
    expect(isRetryable(ErrorCode.ERR_EXPORT_PLAYWRIGHT)).toBe(true);
    expect(isRetryable(ErrorCode.ERR_VALIDATION_CYCLE)).toBe(false);
    expect(isRetryable(ErrorCode.ERR_INTERNAL)).toBe(false);
  });

  it("suggests correct actions", () => {
    expect(suggestedAction(ErrorCode.ERR_IO_READ)).toBe("retry");
    expect(suggestedAction(ErrorCode.ERR_VALIDATION_CYCLE)).toBe("fix_input");
    expect(suggestedAction(ErrorCode.ERR_INTERNAL)).toBe("escalate");
  });

  it("BcmAppError has correct exitCode", () => {
    const err = new BcmAppError(ErrorCode.ERR_IO_FILE_NOT_FOUND, "nope");
    expect(err.exitCode).toBe(50);
    expect(err.toErrorDetail().code).toBe("ERR_IO_FILE_NOT_FOUND");
    expect(err.toErrorDetail().retryable).toBe(false);
  });
});
