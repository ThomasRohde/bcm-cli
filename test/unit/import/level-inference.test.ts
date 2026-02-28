import { inferParentsFromLevels } from "../../../src/import/csv-parser.js";

describe("inferParentsFromLevels", () => {
  it("infers parents from L1/L2/L3 prefixed levels", () => {
    const rows = [
      { id: "enterprise", name: "Enterprise", level: "L1" },
      { id: "cm", name: "Customer Management", level: "L2" },
      { id: "co", name: "Customer Onboarding", level: "L3" },
      { id: "cr", name: "Customer Retention", level: "L3" },
      { id: "pm", name: "Product Management", level: "L2" },
      { id: "pd", name: "Product Development", level: "L3" },
    ] as Record<string, string | number | boolean>[];

    inferParentsFromLevels(rows, "level", "name", "id");

    // L1 has no parent
    expect(rows[0]).not.toHaveProperty("__inferred_parent");
    // L2 nodes parent to L1
    expect(rows[1].__inferred_parent).toBe("enterprise");
    expect(rows[4].__inferred_parent).toBe("enterprise");
    // L3 nodes parent to their preceding L2
    expect(rows[2].__inferred_parent).toBe("cm");
    expect(rows[3].__inferred_parent).toBe("cm");
    expect(rows[5].__inferred_parent).toBe("pm");
  });

  it("infers parents from numeric levels", () => {
    const rows = [
      { name: "Root", level: 1 },
      { name: "Child A", level: 2 },
      { name: "Grandchild", level: 3 },
      { name: "Child B", level: 2 },
    ] as Record<string, string | number | boolean>[];

    inferParentsFromLevels(rows, "level", "name", null);

    expect(rows[0]).not.toHaveProperty("__inferred_parent");
    expect(rows[1].__inferred_parent).toBe("Root");
    expect(rows[2].__inferred_parent).toBe("Child A");
    expect(rows[3].__inferred_parent).toBe("Root");
  });

  it("uses id field when available for parent references", () => {
    const rows = [
      { id: "r1", name: "Root", level: 1 },
      { id: "c1", name: "Child", level: 2 },
    ] as Record<string, string | number | boolean>[];

    inferParentsFromLevels(rows, "level", "name", "id");

    expect(rows[1].__inferred_parent).toBe("r1");
  });

  it("falls back to name when no id field", () => {
    const rows = [
      { name: "Root", level: 1 },
      { name: "Child", level: 2 },
    ] as Record<string, string | number | boolean>[];

    inferParentsFromLevels(rows, "level", "name", null);

    expect(rows[1].__inferred_parent).toBe("Root");
  });

  it("clears deeper stack entries when moving back up", () => {
    const rows = [
      { name: "Root", level: 1 },
      { name: "A", level: 2 },
      { name: "A1", level: 3 },
      { name: "B", level: 2 },
      { name: "B1", level: 3 },
    ] as Record<string, string | number | boolean>[];

    inferParentsFromLevels(rows, "level", "name", null);

    // B1 should parent to B, not A
    expect(rows[4].__inferred_parent).toBe("B");
  });

  it("handles case-insensitive L-prefix", () => {
    const rows = [
      { name: "Root", level: "l1" },
      { name: "Child", level: "l2" },
    ] as Record<string, string | number | boolean>[];

    inferParentsFromLevels(rows, "level", "name", null);

    expect(rows[1].__inferred_parent).toBe("Root");
  });
});
