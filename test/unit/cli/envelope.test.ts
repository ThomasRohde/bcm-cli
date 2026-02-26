import { describe, it, expect } from "vitest";
import { createEnvelope, successEnvelope, errorEnvelope } from "../../../src/cli/envelope.js";
import { BcmAppError, ErrorCode } from "../../../src/cli/errors.js";

describe("envelope", () => {
  it("creates envelope with all required fields", () => {
    const env = createEnvelope("bcm.test", true, { data: 1 });
    expect(env).toHaveProperty("schema_version");
    expect(env).toHaveProperty("request_id");
    expect(env).toHaveProperty("ok", true);
    expect(env).toHaveProperty("command", "bcm.test");
    expect(env).toHaveProperty("result", { data: 1 });
    expect(env).toHaveProperty("warnings");
    expect(env).toHaveProperty("errors");
    expect(env).toHaveProperty("metrics");
    expect(Array.isArray(env.warnings)).toBe(true);
    expect(Array.isArray(env.errors)).toBe(true);
    expect(env.metrics).toHaveProperty("duration_ms");
    expect(env.metrics).toHaveProperty("stages");
  });

  it("successEnvelope sets ok=true", () => {
    const env = successEnvelope("bcm.test", "ok");
    expect(env.ok).toBe(true);
    expect(env.result).toBe("ok");
    expect(env.errors).toHaveLength(0);
  });

  it("errorEnvelope sets ok=false and result=null", () => {
    const err = new BcmAppError(ErrorCode.ERR_IO_FILE_NOT_FOUND, "Not found");
    const env = errorEnvelope("bcm.test", err);
    expect(env.ok).toBe(false);
    expect(env.result).toBeNull();
    expect(env.errors).toHaveLength(1);
    expect(env.errors[0].code).toBe("ERR_IO_FILE_NOT_FOUND");
  });

  it("errorEnvelope wraps non-BcmAppError as ERR_INTERNAL", () => {
    const env = errorEnvelope("bcm.test", new Error("oops"));
    expect(env.errors[0].code).toBe("ERR_INTERNAL");
    expect(env.errors[0].suggested_action).toBe("escalate");
  });

  it("request_id format matches pattern", () => {
    const env = createEnvelope("bcm.test", true, null);
    expect(env.request_id).toMatch(/^req_\d{8}_\d{6}_[0-9a-f]{4}$/);
  });
});
