export enum ErrorCode {
  // I/O
  ERR_IO_FILE_NOT_FOUND = "ERR_IO_FILE_NOT_FOUND",
  ERR_IO_READ = "ERR_IO_READ",
  ERR_IO_WRITE = "ERR_IO_WRITE",

  // Validation
  ERR_VALIDATION_JSON_PARSE = "ERR_VALIDATION_JSON_PARSE",
  ERR_VALIDATION_SCHEMA_DETECT = "ERR_VALIDATION_SCHEMA_DETECT",
  ERR_VALIDATION_NO_NAME_FIELD = "ERR_VALIDATION_NO_NAME_FIELD",
  ERR_VALIDATION_EMPTY_INPUT = "ERR_VALIDATION_EMPTY_INPUT",
  ERR_VALIDATION_CYCLE = "ERR_VALIDATION_CYCLE",
  ERR_VALIDATION_DUPLICATE_ID = "ERR_VALIDATION_DUPLICATE_ID",
  ERR_VALIDATION_MULTIPLE_PARENTS = "ERR_VALIDATION_MULTIPLE_PARENTS",
  ERR_VALIDATION_OPTION = "ERR_VALIDATION_OPTION",

  // Layout
  ERR_LAYOUT_FAILED = "ERR_LAYOUT_FAILED",

  // Export
  ERR_EXPORT_PLAYWRIGHT = "ERR_EXPORT_PLAYWRIGHT",
  ERR_EXPORT_BROWSER_LAUNCH = "ERR_EXPORT_BROWSER_LAUNCH",

  // Internal
  ERR_INTERNAL = "ERR_INTERNAL",
}

type ErrorCategory = "io" | "validation" | "layout" | "export" | "internal";

const CODE_TO_CATEGORY: Record<ErrorCode, ErrorCategory> = {
  [ErrorCode.ERR_IO_FILE_NOT_FOUND]: "io",
  [ErrorCode.ERR_IO_READ]: "io",
  [ErrorCode.ERR_IO_WRITE]: "io",
  [ErrorCode.ERR_VALIDATION_JSON_PARSE]: "validation",
  [ErrorCode.ERR_VALIDATION_SCHEMA_DETECT]: "validation",
  [ErrorCode.ERR_VALIDATION_NO_NAME_FIELD]: "validation",
  [ErrorCode.ERR_VALIDATION_EMPTY_INPUT]: "validation",
  [ErrorCode.ERR_VALIDATION_CYCLE]: "validation",
  [ErrorCode.ERR_VALIDATION_DUPLICATE_ID]: "validation",
  [ErrorCode.ERR_VALIDATION_MULTIPLE_PARENTS]: "validation",
  [ErrorCode.ERR_VALIDATION_OPTION]: "validation",
  [ErrorCode.ERR_LAYOUT_FAILED]: "layout",
  [ErrorCode.ERR_EXPORT_PLAYWRIGHT]: "export",
  [ErrorCode.ERR_EXPORT_BROWSER_LAUNCH]: "export",
  [ErrorCode.ERR_INTERNAL]: "internal",
};

const CATEGORY_EXIT_CODE: Record<ErrorCategory, number> = {
  io: 50,
  validation: 10,
  layout: 20,
  export: 30,
  internal: 90,
};

export function exitCodeForError(code: ErrorCode): number {
  const category = CODE_TO_CATEGORY[code];
  return category ? CATEGORY_EXIT_CODE[category] : 90;
}

export function isRetryable(code: ErrorCode): boolean {
  return [
    ErrorCode.ERR_IO_READ,
    ErrorCode.ERR_IO_WRITE,
    ErrorCode.ERR_EXPORT_PLAYWRIGHT,
    ErrorCode.ERR_EXPORT_BROWSER_LAUNCH,
  ].includes(code);
}

export function suggestedAction(
  code: ErrorCode,
): "retry" | "fix_input" | "escalate" {
  if (isRetryable(code)) return "retry";
  const category = CODE_TO_CATEGORY[code];
  if (category === "validation" || category === "io") return "fix_input";
  return "escalate";
}

export class BcmAppError extends Error {
  code: ErrorCode;
  details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "BcmAppError";
    this.code = code;
    this.details = details;
  }

  toErrorDetail() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      retryable: isRetryable(this.code),
      suggested_action: suggestedAction(this.code),
    };
  }

  get exitCode(): number {
    return exitCodeForError(this.code);
  }
}
