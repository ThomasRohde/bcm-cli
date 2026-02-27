import { describe, it, expect } from "vitest";
import { findNameField, findDescField, findChildrenField, findParentField, findIdField } from "../../../src/import/fields.js";

describe("findNameField", () => {
  it("finds standard 'name' field", () => {
    expect(findNameField({ name: "Test", id: 1 })).toBe("name");
  });
  it("finds 'title' field", () => {
    expect(findNameField({ title: "Test", id: 1 })).toBe("title");
  });
  it("finds 'capability_name' field", () => {
    expect(findNameField({ capability_name: "Test" })).toBe("capability_name");
  });
  it("falls back to first string field", () => {
    expect(findNameField({ count: 1, myLabel: "test" })).toBe("myLabel");
  });
  it("returns override when provided", () => {
    expect(findNameField({ name: "Test" }, "custom")).toBe("custom");
  });
  it("returns null when no string fields exist", () => {
    expect(findNameField({ count: 1, active: true })).toBeNull();
  });
});

describe("findDescField", () => {
  it("finds standard 'description' field", () => {
    expect(findDescField({ name: "a", description: "b" })).toBe("description");
  });
  it("finds 'doc' field", () => {
    expect(findDescField({ name: "a", doc: "b" })).toBe("doc");
  });
  it("returns null when no desc field exists", () => {
    expect(findDescField({ name: "a" })).toBeNull();
  });
});

describe("findChildrenField", () => {
  it("finds 'children' field", () => {
    expect(findChildrenField({ name: "a", children: [{}] })).toBe("children");
  });
  it("finds 'subCapabilities'", () => {
    expect(findChildrenField({ name: "a", subCapabilities: [{}] })).toBe("subCapabilities");
  });
  it("falls back to first array-of-objects field", () => {
    expect(findChildrenField({ name: "a", myItems: [{ n: 1 }] })).toBe("myItems");
  });
  it("ignores children-like keys when value is not an array", () => {
    expect(findChildrenField({ name: "a", children: 0 })).toBeNull();
  });
  it("returns null for no arrays", () => {
    expect(findChildrenField({ name: "a" })).toBeNull();
  });
});

describe("findParentField", () => {
  it("finds 'parent' field", () => {
    expect(findParentField({ name: "a", parent: "b" })).toBe("parent");
  });
  it("finds 'parent_id' field", () => {
    expect(findParentField({ name: "a", parent_id: "1" })).toBe("parent_id");
  });
});

describe("findIdField", () => {
  it("finds 'id' field", () => {
    expect(findIdField({ id: "1", name: "a" })).toBe("id");
  });
  it("finds 'key' field", () => {
    expect(findIdField({ key: "k1", name: "a" })).toBe("key");
  });
});
