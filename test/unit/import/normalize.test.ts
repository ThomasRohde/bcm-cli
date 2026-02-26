import { describe, it, expect } from "vitest";
import { normalizeItems, buildTreeFromFlat } from "../../../src/import/normalize.js";
import { importJson } from "../../../src/import/index.js";
import { ErrorCode } from "../../../src/cli/errors.js";

describe("normalizeItems", () => {
  it("normalizes nested schema", () => {
    const items = [{ name: "Root", children: [{ name: "Child" }] }];
    const { roots } = normalizeItems(items as any, "nested", {
      name: "name", description: null, children: "children", parent: null, id: null,
    });
    expect(roots).toHaveLength(1);
    expect(roots[0].name).toBe("Root");
    expect(roots[0].children).toHaveLength(1);
    expect(roots[0].children[0].name).toBe("Child");
  });

  it("normalizes flat schema", () => {
    const items = [
      { id: "1", name: "Parent", parent_id: null },
      { id: "2", name: "Child", parent_id: "1" },
    ];
    const { roots } = normalizeItems(items as any, "flat", {
      name: "name", description: null, children: null, parent: "parent_id", id: "id",
    });
    expect(roots).toHaveLength(1);
    expect(roots[0].name).toBe("Parent");
    expect(roots[0].children).toHaveLength(1);
  });

  it("normalizes simple schema", () => {
    const items = [{ name: "A" }, { name: "B" }];
    const { roots } = normalizeItems(items as any, "simple", {
      name: "name", description: null, children: null, parent: null, id: null,
    });
    expect(roots).toHaveLength(2);
    expect(roots[0].children).toHaveLength(0);
  });

  it("handles unnamed items", () => {
    const items = [{ name: "" }];
    const { roots } = normalizeItems(items as any, "simple", {
      name: "name", description: null, children: null, parent: null, id: null,
    });
    expect(roots[0].name).toBe("-- unnamed --");
  });

  it("generates deterministic IDs", () => {
    const items = [{ name: "Test" }];
    const r1 = normalizeItems(items as any, "simple", { name: "name", description: null, children: null, parent: null, id: null });
    const r2 = normalizeItems(items as any, "simple", { name: "name", description: null, children: null, parent: null, id: null });
    expect(r1.roots[0].id).toBe(r2.roots[0].id);
  });

  it("throws on cycle in flat parent references", () => {
    const items = [
      { id: "A", name: "Alpha", parent_id: "C" },
      { id: "B", name: "Beta", parent_id: "A" },
      { id: "C", name: "Gamma", parent_id: "B" },
    ];
    expect(() =>
      buildTreeFromFlat(items as any, "name", null, "parent_id", "id"),
    ).toThrow("Cycle detected");
  });

  it("detects cycle in two-node loop", () => {
    const items = [
      { id: "X", name: "X", parent_id: "Y" },
      { id: "Y", name: "Y", parent_id: "X" },
    ];
    expect(() =>
      buildTreeFromFlat(items as any, "name", null, "parent_id", "id"),
    ).toThrow("Cycle detected");
  });

  it("throws on duplicate original IDs in simple schema", () => {
    const items = [
      { id: "1", name: "First" },
      { id: "1", name: "Duplicate" },
      { id: "2", name: "Second" },
    ];
    expect(() =>
      normalizeItems(items as any, "simple", {
        name: "name", description: null, children: null, parent: null, id: "id",
      }),
    ).toThrow("Duplicate ID");
  });

  it("throws on duplicate original IDs in flat schema", () => {
    const items = [
      { id: "1", name: "Root", parent_id: null },
      { id: "1", name: "Dup", parent_id: null },
    ];
    expect(() =>
      normalizeItems(items as any, "flat", {
        name: "name", description: null, children: null, parent: "parent_id", id: "id",
      }),
    ).toThrow("Duplicate ID");
  });

  it("importJson throws for no-string-field objects", () => {
    const raw = JSON.stringify([{ count: 1, active: true }]);
    expect(() => importJson(raw)).toThrow("No name field detected");
  });

  it("warns on unnamed items in simple schema", () => {
    const items = [{ name: "" }, { name: "Valid" }];
    const { warnings } = normalizeItems(items as any, "simple", {
      name: "name", description: null, children: null, parent: null, id: null,
    });
    expect(warnings.some((w) => w.code === "WARN_UNNAMED_ITEM")).toBe(true);
  });

  it("warns on unnamed items in flat schema", () => {
    const items = [
      { id: "1", name: "", parent_id: null },
    ];
    const { warnings } = normalizeItems(items as any, "flat", {
      name: "name", description: null, children: null, parent: "parent_id", id: "id",
    });
    expect(warnings.some((w) => w.code === "WARN_UNNAMED_ITEM")).toBe(true);
  });
});
