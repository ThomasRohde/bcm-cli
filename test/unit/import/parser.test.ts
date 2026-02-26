import { describe, it, expect } from "vitest";
import { parseJson } from "../../../src/import/parser.js";
import { BcmAppError } from "../../../src/cli/errors.js";

describe("parseJson", () => {
  it("parses valid JSON", () => {
    const result = parseJson('[{"name":"A"}]');
    expect(result).toEqual([{ name: "A" }]);
  });

  it("parses objects", () => {
    const result = parseJson('{"key":"value"}');
    expect(result).toEqual({ key: "value" });
  });

  it("throws BcmAppError on invalid JSON", () => {
    expect(() => parseJson("{invalid}")).toThrow(BcmAppError);
  });

  it("includes position details in error", () => {
    try {
      parseJson('{"a": }');
    } catch (err: any) {
      expect(err).toBeInstanceOf(BcmAppError);
      expect(err.code).toBe("ERR_VALIDATION_JSON_PARSE");
      expect(err.details).toHaveProperty("rawError");
    }
  });

  it("parses empty array", () => {
    expect(parseJson("[]")).toEqual([]);
  });
});
