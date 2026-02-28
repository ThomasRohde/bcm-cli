import { marked } from "marked";
import sanitizeHtml, { type IOptions } from "sanitize-html";
import type { ThemeConfig } from "../core/types.js";

export interface HtmlNodeMeta {
  id: string;
  name: string;
  description?: string;
  depth: number;
  isLeaf: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface HtmlNodePayload {
  id: string;
  name: string;
  depth: number;
  isLeaf: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  descriptionHtml: string;
  searchText: string;
}

const SANITIZE_OPTIONS: IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
  ],
  allowedAttributes: {
    a: ["href", "rel", "target"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noopener noreferrer",
    }),
  },
};

function renderMarkdownToSafeHtml(markdown: string | undefined): string {
  if (!markdown || markdown.trim().length === 0) return "";
  const rendered = marked.parse(markdown, {
    gfm: true,
    breaks: true,
  }) as string;
  return sanitizeHtml(rendered, SANITIZE_OPTIONS);
}

function escapeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function buildNodePayload(nodes: HtmlNodeMeta[]): HtmlNodePayload[] {
  return nodes.map((node) => {
    const description = node.description ?? "";
    const descriptionHtml = renderMarkdownToSafeHtml(description);
    const descriptionText = sanitizeHtml(descriptionHtml, {
      allowedTags: [],
      allowedAttributes: {},
    }).replace(/\s+/g, " ").trim();
    return {
      id: node.id,
      name: node.name,
      depth: node.depth,
      isLeaf: node.isLeaf,
      x: node.x,
      y: node.y,
      w: node.w,
      h: node.h,
      descriptionHtml,
      searchText: `${node.name} ${descriptionText}`.toLowerCase(),
    };
  });
}

export function wrapHtml(
  svg: string,
  width: number,
  height: number,
  theme: ThemeConfig,
  nodes: HtmlNodeMeta[] = [],
): string {
  const nodePayload = buildNodePayload(nodes);
  const serializedNodeData = escapeJsonForHtml(nodePayload);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Business Capability Map</title>
<style>
  :root {
    --bcm-bg-1: #f8fafc;
    --bcm-bg-2: #eff6ff;
    --bcm-surface: rgba(255, 255, 255, 0.65);
    --bcm-surface-solid: #ffffff;
    --bcm-border: rgba(148, 163, 184, 0.3);
    --bcm-border-hover: rgba(59, 130, 246, 0.5);
    --bcm-shadow: 0 20px 40px -8px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(148, 163, 184, 0.1);
    --bcm-shadow-sm: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(148, 163, 184, 0.1);
    --bcm-accent: #2563eb;
    --bcm-accent-alt: #ea580c;
    --bcm-text: #0f172a;
    --bcm-muted: #64748b;
    --bcm-font: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    color: var(--bcm-text);
    font-family: var(--bcm-font);
    background: #ffffff;
  }
  .bcm-shell {
    width: 100%;
    margin: 0 auto;
    min-height: 100vh;
    padding: 20px;
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 16px;
  }
  .bcm-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    padding: 14px 20px;
    border: 1px solid rgba(255, 255, 255, 0.7);
    background: var(--bcm-surface);
    border-radius: 20px;
    box-shadow: var(--bcm-shadow);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  .bcm-toolbar__title {
    font-size: 18px;
    font-weight: 700;
    margin-right: 12px;
    letter-spacing: -0.01em;
    background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .bcm-search {
    flex: 1 1 320px;
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .bcm-search input {
    width: 100%;
    height: 40px;
    border-radius: 12px;
    border: 1px solid var(--bcm-border);
    padding: 0 16px;
    font: inherit;
    font-size: 14px;
    color: var(--bcm-text);
    background: rgba(255, 255, 255, 0.8);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.02);
  }
  .bcm-search input:hover {
    background: #ffffff;
    border-color: var(--bcm-border-hover);
  }
  .bcm-search input:focus-visible {
    outline: none;
    background: #ffffff;
    border-color: var(--bcm-accent);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
  .bcm-btn {
    border: 1px solid var(--bcm-border);
    background: linear-gradient(180deg, #ffffff, #f8fafc);
    color: var(--bcm-text);
    height: 40px;
    min-width: 40px;
    border-radius: 12px;
    padding: 0 16px;
    cursor: pointer;
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .bcm-btn:hover { 
    background: #ffffff;
    border-color: var(--bcm-border-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  }
  .bcm-btn:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }
  .bcm-btn:focus-visible {
    outline: none;
    border-color: var(--bcm-accent);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
  .bcm-controls {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  #bcm-zoom-in, #bcm-zoom-out {
    padding: 0;
    width: 40px;
    font-size: 18px;
  }
  .bcm-main {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(260px, 340px) 1fr;
    gap: 16px;
  }
  .bcm-sidebar {
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 20px;
    background: var(--bcm-surface);
    box-shadow: var(--bcm-shadow);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .bcm-sidebar__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    padding: 16px 20px;
    background: rgba(255, 255, 255, 0.4);
  }
  .bcm-sidebar__header h2 {
    font-size: 13px;
    margin: 0;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--bcm-muted);
  }
  .bcm-count {
    color: var(--bcm-accent);
    background: rgba(37, 99, 235, 0.1);
    font-size: 12px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
  }
  .bcm-results {
    margin: 0;
    padding: 12px;
    list-style: none;
    overflow: auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .bcm-results::-webkit-scrollbar,
  .bcm-tooltip__body::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .bcm-results::-webkit-scrollbar-track,
  .bcm-tooltip__body::-webkit-scrollbar-track {
    background: transparent;
  }
  .bcm-results::-webkit-scrollbar-thumb,
  .bcm-tooltip__body::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 10px;
  }
  .bcm-results::-webkit-scrollbar-thumb:hover,
  .bcm-tooltip__body::-webkit-scrollbar-thumb:hover {
    background: rgba(148, 163, 184, 0.5);
  }
  .bcm-result-btn {
    width: 100%;
    text-align: left;
    border: 1px solid transparent;
    border-radius: 12px;
    background: transparent;
    padding: 10px 14px;
    color: var(--bcm-text);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    cursor: pointer;
    font: inherit;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .bcm-result-btn:hover {
    background: #ffffff;
    box-shadow: var(--bcm-shadow-sm);
    transform: translateX(2px);
  }
  .bcm-result-name {
    display: block;
    font-size: 13.5px;
    font-weight: 500;
    line-height: 1.4;
  }
  .bcm-depth-badge {
    color: var(--bcm-accent);
    background: rgba(37, 99, 235, 0.08);
    border: 1px solid rgba(37, 99, 235, 0.15);
    border-radius: 6px;
    font-size: 11px;
    line-height: 1;
    padding: 4px 6px;
    font-weight: 700;
    white-space: nowrap;
  }
  .bcm-result-badges {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .bcm-relevance-meter {
    display: block;
    width: 40px;
    height: 6px;
    border-radius: 3px;
    background: rgba(148, 163, 184, 0.18);
    overflow: hidden;
  }
  .bcm-relevance-fill {
    display: block;
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease-out;
  }
  .bcm-results__empty {
    font-size: 14px;
    color: var(--bcm-muted);
    padding: 20px;
    text-align: center;
  }
  .bcm-stage {
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 20px;
    background: var(--bcm-surface-solid);
    box-shadow: var(--bcm-shadow);
    overflow: hidden;
    position: relative;
    touch-action: none;
    min-height: 60vh;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
  }
  .bcm-stage.bcm-dragging { cursor: grabbing; }
  .bcm-stage .bcm-canvas,
  .bcm-stage svg,
  .bcm-stage text {
    user-select: none;
    -webkit-user-select: none;
  }
  .bcm-canvas {
    transform-origin: 0 0;
    will-change: transform;
    width: ${width}px;
    height: ${height}px;
    transition: transform 0.1s linear;
  }
  .bcm-canvas.bcm-dragging-canvas {
    transition: none;
  }
  .bcm-canvas svg {
    display: block;
    max-width: none;
    height: auto;
    background: ${theme.palette.background};
  }
  .bcm-node { cursor: pointer; transition: opacity 200ms ease-out; }
  .bcm-node text { pointer-events: none; }
  .bcm-node.bcm-dim { opacity: 0.15; }
  .bcm-node rect {
    transition: all 0.2s ease-out;
  }
  .bcm-node:hover rect {
    filter: brightness(0.95);
  }
  .bcm-node.bcm-match rect {
    stroke: var(--bcm-accent) !important;
    stroke-width: 2.5 !important;
  }
  .bcm-node.bcm-selected rect {
    stroke: var(--bcm-accent-alt) !important;
    stroke-width: 3.5 !important;
    filter: drop-shadow(0 4px 12px rgba(234, 88, 12, 0.4));
  }
  .bcm-tooltip {
    position: fixed;
    z-index: 1000;
    width: min(420px, calc(100vw - 32px));
    border-radius: 16px;
    box-shadow: var(--bcm-shadow);
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    overflow: hidden;
    transition: opacity 0.2s ease-out, transform 0.2s ease-out;
    opacity: 0;
    transform: translateY(4px);
    pointer-events: none;
  }
  .bcm-tooltip.bcm-tooltip--visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
  .bcm-tooltip__head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    padding: 16px 20px;
    background: rgba(255, 255, 255, 0.4);
  }
  .bcm-tooltip__title {
    font-size: 15px;
    font-weight: 700;
    line-height: 1.3;
    color: var(--bcm-text);
  }
  .bcm-tooltip__meta {
    color: var(--bcm-muted);
    font-size: 12px;
    margin-top: 4px;
    font-weight: 500;
  }
  .bcm-tooltip__close {
    width: 30px;
    height: 30px;
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    font-weight: 700;
    color: var(--bcm-muted);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .bcm-tooltip__close:hover {
    background: #ffffff;
    color: var(--bcm-text);
    border-color: rgba(148, 163, 184, 0.6);
  }
  .bcm-tooltip__body {
    padding: 20px;
    font-size: 14px;
    line-height: 1.6;
    max-height: min(50vh, 400px);
    overflow: auto;
    color: #334155;
  }
  .bcm-tooltip__body p:first-child { margin-top: 0; }
  .bcm-tooltip__body p:last-child { margin-bottom: 0; }
  .bcm-tooltip__body pre {
    padding: 12px;
    border-radius: 8px;
    overflow: auto;
    background: rgba(15, 23, 42, 0.04);
    border: 1px solid rgba(15, 23, 42, 0.05);
  }
  .bcm-tooltip__body code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 12px;
  }
  .bcm-tooltip__body a { 
    color: var(--bcm-accent);
    text-decoration: none;
    font-weight: 500;
  }
  .bcm-tooltip__body a:hover {
    text-decoration: underline;
  }
  .bcm-tooltip__empty {
    color: var(--bcm-muted);
    font-style: italic;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .bcm-export .bcm-shell-ui,
  .bcm-export .bcm-tooltip {
    display: none !important;
  }
  .bcm-export .bcm-shell {
    padding: 0;
    display: block;
    min-height: 0;
  }
  .bcm-export .bcm-main {
    display: block;
  }
  .bcm-export .bcm-stage {
    border: 0;
    border-radius: 0;
    box-shadow: none;
    min-height: 0;
    overflow: visible;
    cursor: default;
  }
  @media print {
    body { background: #ffffff; }
    .bcm-shell-ui, .bcm-tooltip { display: none !important; }
    .bcm-shell { padding: 0; display: block; }
    .bcm-main { display: block; }
    .bcm-stage {
      border: 0;
      box-shadow: none;
      border-radius: 0;
      overflow: visible;
      min-height: 0;
    }
  }
  @media (max-width: 960px) {
    .bcm-main { grid-template-columns: 1fr; }
    .bcm-sidebar { max-height: 300px; }
    .bcm-stage { min-height: 54vh; }
  }
  @media (prefers-reduced-motion: reduce) {
    .bcm-node, .bcm-node rect, .bcm-result-btn, .bcm-tooltip, .bcm-btn, .bcm-search input, .bcm-relevance-fill {
      transition: none;
    }
  }
</style>
</head>
<body>
<div class="bcm-shell">
  <header class="bcm-toolbar bcm-shell-ui">
    <div class="bcm-toolbar__title">Capability Explorer</div>
    <label class="bcm-search" for="bcm-search-input">
      <span class="sr-only">Search capabilities</span>
      <input id="bcm-search-input" type="search" placeholder="Search name or description..." autocomplete="off" />
      <button id="bcm-clear-search" class="bcm-btn" type="button">Clear</button>
    </label>
    <div class="bcm-controls">
      <button id="bcm-zoom-out" class="bcm-btn" type="button" aria-label="Zoom out">-</button>
      <button id="bcm-zoom-in" class="bcm-btn" type="button" aria-label="Zoom in">+</button>
      <button id="bcm-fit" class="bcm-btn" type="button">Fit</button>
      <button id="bcm-reset" class="bcm-btn" type="button">Reset</button>
    </div>
  </header>
  <div class="bcm-main">
    <aside class="bcm-sidebar bcm-shell-ui" aria-label="Search results">
      <div class="bcm-sidebar__header">
        <h2>Results</h2>
        <span id="bcm-results-count" class="bcm-count">0</span>
      </div>
      <ul id="bcm-results-list" class="bcm-results"></ul>
    </aside>
    <section id="bcm-stage" class="bcm-stage" aria-label="Capability map viewport">
      <div id="bcm-canvas" class="bcm-canvas">
${svg}
      </div>
    </section>
  </div>
</div>

<aside id="bcm-tooltip" class="bcm-tooltip">
  <div class="bcm-tooltip__head">
    <div>
      <div id="bcm-tooltip-title" class="bcm-tooltip__title"></div>
      <div id="bcm-tooltip-meta" class="bcm-tooltip__meta"></div>
    </div>
    <button id="bcm-tooltip-close" class="bcm-tooltip__close bcm-shell-ui" type="button" aria-label="Close tooltip">x</button>
  </div>
  <div id="bcm-tooltip-body" class="bcm-tooltip__body"></div>
</aside>

<script id="bcm-node-data" type="application/json">${serializedNodeData}</script>
<script>
(() => {
  if (document.documentElement.classList.contains("bcm-export")) return;

  const MIN_SCALE = 0.25;
  const MAX_SCALE = 4;
  const ZOOM_STEP = 1.15;
  const EMPTY_DESCRIPTION_HTML = "<p class=\\"bcm-tooltip__empty\\">No description provided.</p>";
  const mapWidth = ${width};
  const mapHeight = ${height};

  const stage = document.getElementById("bcm-stage");
  const canvas = document.getElementById("bcm-canvas");
  const tooltip = document.getElementById("bcm-tooltip");
  const tooltipTitle = document.getElementById("bcm-tooltip-title");
  const tooltipBody = document.getElementById("bcm-tooltip-body");
  const tooltipMeta = document.getElementById("bcm-tooltip-meta");
  const tooltipClose = document.getElementById("bcm-tooltip-close");
  const searchInput = document.getElementById("bcm-search-input");
  const clearSearch = document.getElementById("bcm-clear-search");
  const resultsList = document.getElementById("bcm-results-list");
  const resultsCount = document.getElementById("bcm-results-count");
  const zoomIn = document.getElementById("bcm-zoom-in");
  const zoomOut = document.getElementById("bcm-zoom-out");
  const fitBtn = document.getElementById("bcm-fit");
  const resetBtn = document.getElementById("bcm-reset");
  const nodeDataScript = document.getElementById("bcm-node-data");

  if (!(stage instanceof HTMLElement) ||
      !(canvas instanceof HTMLElement) ||
      !(tooltip instanceof HTMLElement) ||
      !(tooltipTitle instanceof HTMLElement) ||
      !(tooltipBody instanceof HTMLElement) ||
      !(tooltipMeta instanceof HTMLElement) ||
      !(tooltipClose instanceof HTMLElement) ||
      !(searchInput instanceof HTMLInputElement) ||
      !(clearSearch instanceof HTMLButtonElement) ||
      !(resultsList instanceof HTMLElement) ||
      !(resultsCount instanceof HTMLElement) ||
      !(zoomIn instanceof HTMLButtonElement) ||
      !(zoomOut instanceof HTMLButtonElement) ||
      !(fitBtn instanceof HTMLButtonElement) ||
      !(resetBtn instanceof HTMLButtonElement) ||
      !(nodeDataScript instanceof HTMLScriptElement)
  ) {
    return;
  }

  const svg = canvas.querySelector("svg");
  if (!(svg instanceof SVGElement)) return;

  let nodeData = [];
  try {
    nodeData = JSON.parse(nodeDataScript.textContent || "[]");
  } catch {
    nodeData = [];
  }

  const dataById = new Map();
  for (const item of nodeData) {
    if (item && typeof item.id === "string") dataById.set(item.id, item);
  }

  const svgNodes = new Map();
  svg.querySelectorAll(".bcm-node").forEach((el) => {
    const id = el.getAttribute("data-node-id");
    if (id) svgNodes.set(id, el);
  });

  // BM25 search index
  const BM25_K1 = 1.2;
  const BM25_B = 0.75;
  const STOP_WORDS = new Set([
    "a","an","and","are","as","at","be","but","by","for","if","in","into",
    "is","it","no","not","of","on","or","such","that","the","their","then",
    "there","these","they","this","to","was","will","with"
  ]);

  function tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\\s+/)
      .filter(function(t) { return t.length > 1 && !STOP_WORDS.has(t); });
  }

  var docTokens = [];
  var totalTokens = 0;
  for (var di = 0; di < nodeData.length; di++) {
    var tokens = tokenize(nodeData[di].searchText || "");
    docTokens.push({ tokens: tokens, length: tokens.length });
    totalTokens += tokens.length;
  }
  var corpusSize = nodeData.length;
  var avgDocLength = corpusSize > 0 ? totalTokens / corpusSize : 1;

  var docFreq = new Map();
  for (var di2 = 0; di2 < docTokens.length; di2++) {
    var seen = new Set(docTokens[di2].tokens);
    seen.forEach(function(term) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    });
  }

  function scoreBM25(queryTokens) {
    var results = [];
    for (var i = 0; i < nodeData.length; i++) {
      var doc = docTokens[i];
      var tf = new Map();
      for (var j = 0; j < doc.tokens.length; j++) {
        var t = doc.tokens[j];
        tf.set(t, (tf.get(t) || 0) + 1);
      }
      var score = 0;
      for (var q = 0; q < queryTokens.length; q++) {
        var term = queryTokens[q];
        var freq = tf.get(term) || 0;
        if (freq === 0) continue;
        var df = docFreq.get(term) || 0;
        var idf = Math.max(0, Math.log((corpusSize - df + 0.5) / (df + 0.5) + 1));
        var tfNorm = (freq * (BM25_K1 + 1)) / (freq + BM25_K1 * (1 - BM25_B + BM25_B * doc.length / avgDocLength));
        score += idf * tfNorm;
      }
      if (score > 0) {
        results.push({ id: nodeData[i].id, score: score });
      }
    }
    results.sort(function(a, b) { return b.score - a.score; });
    return results;
  }

  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let pinnedId = null;
  let hoveredId = null;
  let selectedId = null;
  let lastMatches = [];
  let lastPointerX = window.innerWidth / 2;
  let lastPointerY = window.innerHeight / 2;
  let dragging = false;
  let dragPointerId = null;
  let dragStartX = 0;
  let dragStartY = 0;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function applyTransform() {
    canvas.style.transform =
      "translate(" + translateX + "px, " + translateY + "px) scale(" + scale + ")";
  }

  function getNodeElement(target) {
    if (!(target instanceof Element)) return null;
    return target.closest(".bcm-node");
  }

  function setSelectedNode(id) {
    if (selectedId && svgNodes.has(selectedId)) {
      svgNodes.get(selectedId).classList.remove("bcm-selected");
    }
    selectedId = id;
    if (selectedId && svgNodes.has(selectedId)) {
      svgNodes.get(selectedId).classList.add("bcm-selected");
    }
  }

  function setTooltipPosition(clientX, clientY) {
    const offset = 16;
    const margin = 10;
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";
    const tipWidth = tooltip.offsetWidth;
    const tipHeight = tooltip.offsetHeight;

    let x = clientX + offset;
    let y = clientY + offset;
    const maxX = window.innerWidth - tipWidth - margin;
    const maxY = window.innerHeight - tipHeight - margin;

    if (x > maxX) x = clientX - tipWidth - offset;
    if (y > maxY) y = clientY - tipHeight - offset;

    x = clamp(x, margin, Math.max(margin, maxX));
    y = clamp(y, margin, Math.max(margin, maxY));

    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  function showTooltip(id, isPinned, clientX, clientY) {
    const meta = dataById.get(id);
    if (!meta) return;
    tooltipTitle.textContent = meta.name;
    tooltipBody.innerHTML = meta.descriptionHtml || EMPTY_DESCRIPTION_HTML;
    tooltipMeta.textContent = isPinned ? "Pinned. Press Esc to close." : "Click capability to pin.";
    tooltip.classList.add("bcm-tooltip--visible");
    setTooltipPosition(clientX, clientY);
  }

  function hideTooltip() {
    tooltip.classList.remove("bcm-tooltip--visible");
  }

  function getNodeScreenCenter(id) {
    const meta = dataById.get(id);
    if (!meta) return null;
    const stageRect = stage.getBoundingClientRect();
    return {
      x: stageRect.left + translateX + (meta.x + meta.w / 2) * scale,
      y: stageRect.top + translateY + (meta.y + meta.h / 2) * scale,
    };
  }

  function focusNode(id, pinTooltip) {
    const meta = dataById.get(id);
    if (!meta) return;

    translateX = stage.clientWidth / 2 - (meta.x + meta.w / 2) * scale;
    translateY = stage.clientHeight / 2 - (meta.y + meta.h / 2) * scale;
    applyTransform();
    setSelectedNode(id);

    const center = getNodeScreenCenter(id);
    if (!center) return;

    if (pinTooltip) {
      pinnedId = id;
      showTooltip(id, true, center.x, center.y);
      return;
    }

    showTooltip(id, false, center.x, center.y);
  }

  function clearNodeClasses() {
    setSelectedNode(null);
    pinnedId = null;
    hideTooltip();
    svgNodes.forEach((el) => {
      el.classList.remove("bcm-dim");
      el.classList.remove("bcm-match");
    });
  }

  function renderResults(query, matches) {
    resultsList.textContent = "";

    if (!query) {
      resultsCount.textContent = String(nodeData.length);
      const li = document.createElement("li");
      li.className = "bcm-results__empty";
      li.textContent = "Type in search to filter capabilities.";
      resultsList.append(li);
      return;
    }

    resultsCount.textContent = String(matches.length);
    if (matches.length === 0) {
      const li = document.createElement("li");
      li.className = "bcm-results__empty";
      li.textContent = "No capabilities matched your query.";
      resultsList.append(li);
      return;
    }

    var maxScore = matches[0].score || 1;

    for (var mi = 0; mi < matches.length; mi++) {
      var match = matches[mi];
      var li = document.createElement("li");
      var button = document.createElement("button");
      button.type = "button";
      button.className = "bcm-result-btn";
      button.dataset.nodeId = match.id;

      var nameSpan = document.createElement("span");
      nameSpan.className = "bcm-result-name";
      nameSpan.textContent = match.name;

      var badges = document.createElement("span");
      badges.className = "bcm-result-badges";

      var normalized = maxScore > 0 ? match.score / maxScore : 0;
      var pct = Math.round(normalized * 100);
      var meter = document.createElement("span");
      meter.className = "bcm-relevance-meter";
      meter.setAttribute("aria-label", "Relevance: " + pct + "%");
      meter.title = "Relevance: " + pct + "%";

      var fill = document.createElement("span");
      fill.className = "bcm-relevance-fill";
      fill.style.width = pct + "%";
      var sat = Math.round(30 + normalized * 60);
      var lit = Math.round(70 - normalized * 25);
      fill.style.background = "hsl(217, " + sat + "%, " + lit + "%)";
      meter.append(fill);

      var badge = document.createElement("span");
      badge.className = "bcm-depth-badge";
      badge.textContent = "L" + String(match.depth);

      badges.append(meter, badge);
      button.append(nameSpan, badges);
      button.addEventListener("click", (function(id) {
        return function() { focusNode(id, true); };
      })(match.id));

      li.append(button);
      resultsList.append(li);
    }
  }

  function applySearch(queryText) {
    const query = queryText.trim().toLowerCase();
    if (!query) {
      clearNodeClasses();
      lastMatches = [];
      renderResults(query, lastMatches);
      return;
    }

    var queryTokens = tokenize(query);

    if (queryTokens.length === 0) {
      // Fallback: substring match with uniform score for short/stop-word queries
      var substringMatches = [];
      for (var si = 0; si < nodeData.length; si++) {
        var entry = nodeData[si];
        if (typeof entry.searchText === "string" && entry.searchText.includes(query)) {
          substringMatches.push({
            id: entry.id,
            name: entry.name,
            depth: entry.depth,
            score: 1
          });
        }
      }
      lastMatches = substringMatches;
    } else {
      var scored = scoreBM25(queryTokens);
      var enriched = [];
      for (var ei = 0; ei < scored.length; ei++) {
        var meta = dataById.get(scored[ei].id);
        if (meta) {
          enriched.push({
            id: scored[ei].id,
            name: meta.name,
            depth: meta.depth,
            score: scored[ei].score
          });
        }
      }
      lastMatches = enriched;
    }

    var matchIds = new Set(lastMatches.map(function(m) { return m.id; }));

    svgNodes.forEach(function(el, id) {
      var isMatch = matchIds.has(id);
      el.classList.toggle("bcm-match", isMatch);
      el.classList.toggle("bcm-dim", !isMatch);
    });

    renderResults(query, lastMatches);
  }

  function zoomAt(clientX, clientY, factor) {
    const stageRect = stage.getBoundingClientRect();
    const nextScale = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
    if (Math.abs(nextScale - scale) < 0.0001) return;

    const localX = clientX - stageRect.left;
    const localY = clientY - stageRect.top;
    const ratio = nextScale / scale;

    translateX = localX - (localX - translateX) * ratio;
    translateY = localY - (localY - translateY) * ratio;
    scale = nextScale;
    applyTransform();
  }

  function fitToView() {
    const availableWidth = Math.max(1, stage.clientWidth - 28);
    const availableHeight = Math.max(1, stage.clientHeight - 28);
    const fitScale = clamp(
      Math.min(availableWidth / mapWidth, availableHeight / mapHeight),
      MIN_SCALE,
      MAX_SCALE,
    );
    scale = fitScale;
    translateX = (stage.clientWidth - mapWidth * scale) / 2;
    translateY = (stage.clientHeight - mapHeight * scale) / 2;
    applyTransform();
  }

  function resetView() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    applyTransform();
  }

  searchInput.addEventListener("input", () => {
    applySearch(searchInput.value);
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && lastMatches.length > 0) {
      event.preventDefault();
      focusNode(lastMatches[0].id, true);
    }
    if (event.key === "Escape") {
      searchInput.value = "";
      applySearch("");
    }
  });

  clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    applySearch("");
    searchInput.focus();
  });

  zoomIn.addEventListener("click", () => {
    const rect = stage.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, ZOOM_STEP);
  });

  zoomOut.addEventListener("click", () => {
    const rect = stage.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1 / ZOOM_STEP);
  });

  fitBtn.addEventListener("click", () => {
    fitToView();
  });

  resetBtn.addEventListener("click", () => {
    resetView();
  });

  stage.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      zoomAt(event.clientX, event.clientY, factor);
    },
    { passive: false },
  );

  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging = true;
    dragPointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    stage.classList.add("bcm-dragging");
    canvas.classList.add("bcm-dragging-canvas");
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!dragging || dragPointerId !== event.pointerId) return;
    translateX += event.clientX - dragStartX;
    translateY += event.clientY - dragStartY;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    applyTransform();
  });

  stage.addEventListener("pointerup", (event) => {
    if (dragPointerId !== event.pointerId) return;
    
    const dist = Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY);
    const wasClick = dist < 5;

    dragging = false;
    dragPointerId = null;
    stage.classList.remove("bcm-dragging");
    canvas.classList.remove("bcm-dragging-canvas");
    stage.releasePointerCapture(event.pointerId);

    if (wasClick) {
      const targetElement = document.elementFromPoint(event.clientX, event.clientY);
      const node = getNodeElement(targetElement);
      if (node) {
        const nodeId = node.getAttribute("data-node-id");
        if (nodeId) {
          setSelectedNode(nodeId);
          if (pinnedId === nodeId) {
            pinnedId = null;
            if (hoveredId === nodeId) {
              showTooltip(nodeId, false, lastPointerX, lastPointerY);
            } else {
              hideTooltip();
            }
          } else {
            pinnedId = nodeId;
            const center = getNodeScreenCenter(nodeId);
            if (center) {
              showTooltip(nodeId, true, center.x, center.y);
            } else {
              showTooltip(nodeId, true, lastPointerX, lastPointerY);
            }
          }
        }
      } else {
        pinnedId = null;
        setSelectedNode(null);
        hideTooltip();
      }
    }
  });

  stage.addEventListener("pointercancel", () => {
    dragging = false;
    dragPointerId = null;
    stage.classList.remove("bcm-dragging");
    canvas.classList.remove("bcm-dragging-canvas");
  });

  svg.addEventListener("pointermove", (event) => {
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    const node = getNodeElement(event.target);
    if (!node) {
      if (hoveredId) {
        hoveredId = null;
        if (!pinnedId) hideTooltip();
      }
      return;
    }

    const nodeId = node.getAttribute("data-node-id");
    if (!nodeId) return;
    hoveredId = nodeId;
    if (!pinnedId) {
      showTooltip(nodeId, false, lastPointerX, lastPointerY);
    }
  });

  svg.addEventListener("pointerleave", () => {
    hoveredId = null;
    if (!pinnedId) hideTooltip();
  });



  tooltipClose.addEventListener("click", () => {
    pinnedId = null;
    hideTooltip();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (pinnedId) {
      pinnedId = null;
      if (hoveredId) {
        showTooltip(hoveredId, false, lastPointerX, lastPointerY);
      } else {
        hideTooltip();
      }
    } else {
      hideTooltip();
    }
  });

  window.addEventListener("resize", () => {
    if (!tooltip.classList.contains("bcm-tooltip--visible") || !pinnedId) return;
    const center = getNodeScreenCenter(pinnedId);
    if (center) setTooltipPosition(center.x, center.y);
  });

  applyTransform();
  renderResults("", []);
})();
</script>
</body>
</html>`;
}
