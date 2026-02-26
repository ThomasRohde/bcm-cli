import type {
  Envelope,
  BcmErrorDetail,
  BcmWarning,
  StageMetrics,
} from "../core/types.js";
import { SCHEMA_VERSION } from "../core/defaults.js";
import { generateRequestId } from "./request-id.js";
import { BcmAppError } from "./errors.js";

export function createEnvelope<T>(
  command: string,
  ok: boolean,
  result: T | null,
  options?: {
    warnings?: BcmWarning[];
    errors?: BcmErrorDetail[];
    duration_ms?: number;
    stages?: StageMetrics;
    request_id?: string;
  },
): Envelope<T> {
  return {
    schema_version: SCHEMA_VERSION,
    request_id: options?.request_id ?? generateRequestId(),
    ok,
    command,
    result,
    warnings: options?.warnings ?? [],
    errors: options?.errors ?? [],
    metrics: {
      duration_ms: options?.duration_ms ?? 0,
      stages: options?.stages ?? {},
    },
  };
}

export function successEnvelope<T>(
  command: string,
  result: T,
  options?: {
    warnings?: BcmWarning[];
    duration_ms?: number;
    stages?: StageMetrics;
    request_id?: string;
  },
): Envelope<T> {
  return createEnvelope(command, true, result, options);
}

export function errorEnvelope(
  command: string,
  error: BcmAppError | Error,
  options?: {
    warnings?: BcmWarning[];
    duration_ms?: number;
    stages?: StageMetrics;
    request_id?: string;
  },
): Envelope<null> {
  const errors: BcmErrorDetail[] = [];
  if (error instanceof BcmAppError) {
    errors.push(error.toErrorDetail());
  } else {
    errors.push({
      code: "ERR_INTERNAL",
      message: error.message,
      retryable: false,
      suggested_action: "escalate",
    });
  }
  return createEnvelope(command, false, null, {
    ...options,
    errors,
  });
}
