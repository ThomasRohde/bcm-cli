import type { CapabilityNode, LayoutNode, LayoutOptions, LayoutResult, MeasureTextFn, Size } from "../core/types.js";
import { computeUniformLeafSize } from "./leaf-sizing.js";
import { calculateSize } from "./calculate-size.js";
import { positionRoots } from "./position.js";

function toLayoutNode(cap: CapabilityNode): LayoutNode {
  return {
    id: cap.id,
    name: cap.name,
    description: cap.description,
    children: cap.children.map(toLayoutNode),
    size: { w: 0, h: 0 },
    rows: [],
    position: { x: 0, y: 0 },
    depth: 0,
    _effectiveLeaf: false,
  };
}

function collectAllNodes(node: LayoutNode): LayoutNode[] {
  const result: LayoutNode[] = [node];
  for (const child of node.children) {
    result.push(...collectAllNodes(child));
  }
  return result;
}

export function layoutTrees(
  roots: CapabilityNode[],
  options: LayoutOptions,
  measureText: MeasureTextFn,
): LayoutResult {
  // Convert to LayoutNodes
  const layoutRoots = roots.map(toLayoutNode);

  // Phase 1: Uniform leaf sizing
  const { leafWidth, leafHeight } = computeUniformLeafSize(layoutRoots, options, measureText);

  // Phase 2: Bottom-up size computation
  for (const root of layoutRoots) {
    calculateSize(root, 0, leafWidth, leafHeight, options);
  }

  // Phase 3: Top-down positioning
  positionRoots(layoutRoots, options);

  // Compute total dimensions
  let totalWidth = 0;
  let totalHeight = 0;
  for (const root of layoutRoots) {
    const right = root.position.x + root.size.w;
    const bottom = root.position.y + root.size.h;
    if (right > totalWidth) totalWidth = right;
    if (bottom > totalHeight) totalHeight = bottom;
  }
  totalWidth += options.viewMargin;
  totalHeight += options.viewMargin;

  // Collect all nodes
  const allNodes: LayoutNode[] = [];
  for (const root of layoutRoots) {
    allNodes.push(...collectAllNodes(root));
  }

  return {
    nodes: allNodes,
    totalWidth,
    totalHeight,
    leafSize: { w: leafWidth, h: leafHeight },
  };
}
