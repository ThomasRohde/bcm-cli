import { describe, it, expect } from "vitest";
import { detectSchema } from "../../../src/import/detect.js";

describe("detectSchema", () => {
  it("detects nested schema", () => {
    expect(detectSchema([{ name: "A", children: [{ name: "B" }] }])).toBe("nested");
  });
  it("detects nested schema when a later sampled item has children", () => {
    expect(detectSchema([
      { name: "Leaf" },
      { name: "Parent", children: [{ name: "Child" }] },
    ] as any)).toBe("nested");
  });
  it("detects flat schema", () => {
    expect(detectSchema([
      { name: "A", parent: null },
      { name: "B", parent: "A" }
    ])).toBe("flat");
  });
  it("does not treat scalar 'children' fields as nested", () => {
    expect(detectSchema([
      { id: "A", name: "A", children: 0, parent_id: null },
      { id: "B", name: "B", children: 0, parent_id: "A" },
    ] as any)).toBe("flat");
  });
  it("detects simple schema", () => {
    expect(detectSchema([{ name: "A" }, { name: "B" }])).toBe("simple");
  });
  it("returns null for empty array", () => {
    expect(detectSchema([])).toBeNull();
  });
  it("returns null for non-object items", () => {
    expect(detectSchema(["a", "b"] as any)).toBeNull();
  });
});
