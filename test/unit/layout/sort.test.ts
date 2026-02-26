import { describe, it, expect } from "vitest";
import { sortChildren } from "../../../src/layout/sort.js";
import type { LayoutNode } from "../../../src/core/types.js";

function makeNode(name: string, isLeaf: boolean): LayoutNode {
  return {
    id: name, name, children: [],
    size: { w: 100, h: 50 }, rows: [], position: { x: 0, y: 0 },
    depth: 0, _effectiveLeaf: isLeaf,
  };
}

describe("sortChildren", () => {
  it("subtrees-first mode puts subtrees before leaves", () => {
    const children = [
      makeNode("Leaf B", true),
      makeNode("Sub A", false),
      makeNode("Leaf A", true),
      makeNode("Sub B", false),
    ];
    sortChildren(children, "subtrees");
    expect(children[0]._effectiveLeaf).toBe(false);
    expect(children[1]._effectiveLeaf).toBe(false);
    expect(children[2]._effectiveLeaf).toBe(true);
    expect(children[3]._effectiveLeaf).toBe(true);
  });

  it("subtrees-first mode sorts alphabetically within groups", () => {
    const children = [
      makeNode("Zeta", false),
      makeNode("Alpha", false),
    ];
    sortChildren(children, "subtrees");
    expect(children[0].name).toBe("Alpha");
    expect(children[1].name).toBe("Zeta");
  });

  it("alphabetical mode sorts all by name", () => {
    const children = [
      makeNode("Zeta", true),
      makeNode("Alpha", false),
      makeNode("Beta", true),
    ];
    sortChildren(children, "alphabetical");
    expect(children[0].name).toBe("Alpha");
    expect(children[1].name).toBe("Beta");
    expect(children[2].name).toBe("Zeta");
  });
});
