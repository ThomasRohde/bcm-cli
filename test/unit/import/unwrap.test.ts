import { describe, it, expect } from "vitest";
import { unwrapData } from "../../../src/import/unwrap.js";

describe("unwrapData", () => {
  it("passes through a top-level array", () => {
    const data = [{ name: "A" }, { name: "B" }];
    const { items, warnings } = unwrapData(data);
    expect(items).toHaveLength(2);
    expect(warnings).toHaveLength(0);
  });

  it("unwraps a wrapper object with children but no name", () => {
    const data = { children: [{ name: "A" }] };
    const { items, warnings } = unwrapData(data);
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveProperty("name", "A");
    expect(warnings.some((w) => w.code === "WARN_UNWRAP_WRAPPER")).toBe(true);
  });

  it("treats a single root node as one-item array", () => {
    const data = { name: "Root", children: [{ name: "Child" }] };
    const { items } = unwrapData(data);
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveProperty("name", "Root");
  });

  it("unwraps explicit property", () => {
    const data = { capabilities: [{ name: "A" }], meta: "ignored" };
    const { items } = unwrapData(data, "capabilities");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveProperty("name", "A");
  });

  it("unwraps object with unnamed array as wrapper", () => {
    // "records" is not in CHILDREN_CANDIDATES, but findChildrenField falls
    // back to first array of objects, so this is treated as a wrapper unwrap
    const data = { version: 2, records: [{ name: "A" }] };
    const { items, warnings } = unwrapData(data);
    expect(items).toHaveLength(1);
    expect(warnings.some((w) => w.code === "WARN_UNWRAP_WRAPPER")).toBe(true);
  });

  it("throws on empty array", () => {
    expect(() => unwrapData([])).toThrow("empty");
  });

  it("throws when explicit property not found", () => {
    expect(() => unwrapData({ foo: 1 }, "bar")).toThrow('not found');
  });

  it("throws on scalar data", () => {
    expect(() => unwrapData("hello")).toThrow();
  });
});
