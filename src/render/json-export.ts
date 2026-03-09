import type { LayoutResult, LayoutNode, CapabilityNode } from "../core/types.js";

interface JsonExportNode {
  id: string;
  name: string;
  description?: string;
  properties: Record<string, string | number | boolean>;
  depth: number;
  isLeaf: boolean;
  position: { x: number; y: number };
  size: { w: number; h: number };
  children: JsonExportNode[];
}

interface JsonExportData {
  version: "1.0";
  canvas: {
    width: number;
    height: number;
    leafSize: { w: number; h: number };
  };
  nodes: JsonExportNode[];
}

function buildCapabilityMap(roots: CapabilityNode[]): Map<string, CapabilityNode> {
  const map = new Map<string, CapabilityNode>();
  function walk(node: CapabilityNode): void {
    map.set(node.id, node);
    for (const child of node.children) {
      walk(child);
    }
  }
  for (const root of roots) {
    walk(root);
  }
  return map;
}

function mapNode(layoutNode: LayoutNode, capMap: Map<string, CapabilityNode>): JsonExportNode {
  const cap = capMap.get(layoutNode.id);
  const result: JsonExportNode = {
    id: layoutNode.id,
    name: layoutNode.name,
    depth: layoutNode.depth,
    isLeaf: layoutNode._effectiveLeaf,
    position: { x: layoutNode.position.x, y: layoutNode.position.y },
    size: { w: layoutNode.size.w, h: layoutNode.size.h },
    properties: cap?.properties ?? {},
    children: layoutNode.children.map((child) => mapNode(child, capMap)),
  };
  if (layoutNode.description !== undefined) {
    result.description = layoutNode.description;
  }
  return result;
}

export function buildJsonExport(layoutResult: LayoutResult, roots: CapabilityNode[]): JsonExportData {
  const capMap = buildCapabilityMap(roots);
  return {
    version: "1.0",
    canvas: {
      width: layoutResult.totalWidth,
      height: layoutResult.totalHeight,
      leafSize: { w: layoutResult.leafSize.w, h: layoutResult.leafSize.h },
    },
    nodes: layoutResult.nodes.map((node) => mapNode(node, capMap)),
  };
}
