import type { LayoutNode, LayoutResult, ThemeConfig } from "../core/types.js";
import { SvgBuilder } from "./svg-builder.js";

export function renderSvg(layout: LayoutResult, theme: ThemeConfig): string {
  const svg = new SvgBuilder();

  // Background rect
  svg.rect({
    x: 0,
    y: 0,
    width: layout.totalWidth,
    height: layout.totalHeight,
    fill: theme.palette.background,
  });

  // Render nodes in depth-first order
  function renderNode(node: LayoutNode): void {
    const fill = node._effectiveLeaf
      ? theme.palette.leafFill
      : theme.palette.depthFills[
          Math.min(node.depth, theme.palette.depthFills.length - 1)
        ];

    svg.rect({
      x: node.position.x,
      y: node.position.y,
      width: node.size.w,
      height: node.size.h,
      rx: theme.display.cornerRadius,
      ry: theme.display.cornerRadius,
      fill,
      stroke: theme.palette.border,
      "stroke-width": theme.display.strokeWidth,
    });

    // Text
    const font = node._effectiveLeaf
      ? theme.typography.leafFont
      : theme.typography.parentFont;
    const fontWeight = font.style === "bold" ? "bold" : "normal";
    const fontSize = font.size;
    const fontFamily = font.name;
    const textColor = font.color || "#000000";

    if (node._effectiveLeaf) {
      // Center text on leaf
      svg.text(node.name, {
        x: node.position.x + node.size.w / 2,
        y: node.position.y + node.size.h / 2,
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-family": fontFamily,
        "font-size": fontSize,
        "font-weight": fontWeight,
        fill: textColor,
      });
    } else {
      // Top-align text on parent, centered horizontally in the header area
      svg.text(node.name, {
        x: node.position.x + node.size.w / 2,
        y: node.position.y + theme.spacing.headerHeight / 2,
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-family": fontFamily,
        "font-size": fontSize,
        "font-weight": fontWeight,
        fill: textColor,
      });
    }

    // Recurse children (depth-first)
    for (const child of node.children) {
      renderNode(child);
    }
  }

  // Render from root nodes only (depth 0) to avoid duplicate rendering.
  // layout.nodes is a flat list of ALL nodes, but each node still has
  // .children references, so recursing from roots covers every node exactly once.
  const roots = layout.nodes.filter((n) => n.depth === 0);
  for (const root of roots) {
    renderNode(root);
  }

  return svg.toString(layout.totalWidth, layout.totalHeight);
}
