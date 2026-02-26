# Product Requirements Document (PRD): BCM JSON → Capability Map Rendering Harness (CLI)

> **Reference material** — this PRD draws on three companion context files:
>
> | File | Purpose |
> |------|---------|
> | [`context/archi-src/Build Capability Map.ajs`][ref-layout] | Reference implementation of the adaptive flow layout algorithm (scoring, banded flow, backfill) and rendering pipeline in Archi/jArchi. |
> | [`context/archi-src/Import Capabilities from JSON.ajs`][ref-import] | Reference implementation of JSON schema detection heuristics, field candidate lists, and normalisation to a uniform tree. |
> | [`context/archi-src/capabilityMapDialog.js`][ref-dialog] | Configuration defaults (spacing, colours, fonts, leaf sizing) and option catalogue from the Archi dialog. |
> | [`context/CLI-MANIFEST.md`][ref-manifest] | Agent-first CLI design principles: structured envelopes, error codes, exit code ranges, TOON, `LLM=true`, `guide` command, observability. |
>
> [ref-layout]: archi-src/Build%20Capability%20Map.ajs
> [ref-import]: archi-src/Import%20Capabilities%20from%20JSON.ajs
> [ref-dialog]: archi-src/capabilityMapDialog.js
> [ref-manifest]: CLI-MANIFEST.md

## 1. Purpose
Deliver a **cross-platform, agent-first CLI harness** that:
1) ingests a Business Capability Model (BCM) from **JSON** (in multiple commonly-seen schemas),
2) normalises it into a consistent internal tree representation,
3) applies a custom **adaptive flow layout** algorithm (ported from the proven Archi/jArchi implementation in [`Build Capability Map.ajs`][ref-layout]),
4) renders a **canonical SVG**, and
5) exports **HTML, PNG, and PDF** (PNG/PDF via Playwright for consistent typography and page rendering).

The harness is deterministic, automatable (CI-friendly), agent-drivable (structured JSON on stdout, diagnostics on stderr — per [`CLI-MANIFEST.md`][ref-manifest]), and sufficiently configurable for enterprise branding and varying depth/complexity of capability models.

---

## 2. Goals
- **One-command generation** of capability maps from JSON to SVG/HTML/PNG/PDF.
- **Schema-flexible import**: accept different JSON shapes without requiring pre-processing.
- **Consistent, legible layouts**: minimise whitespace, keep leaf sizes uniform, and maintain stable ordering.
- **Reproducible output**: identical inputs + options produce identical artefacts (subject to font availability).
- **Agent-first operation**: every command returns a structured JSON envelope on stdout; stderr is reserved for human-readable progress and diagnostics. The CLI respects `LLM=true` and `isatty()` conventions (per [`CLI-MANIFEST.md`][ref-manifest] §§1, 7, 8).
- **Zero-shot discoverability**: a built-in `guide` command returns the full CLI schema, error codes, and examples as JSON so agents can drive the tool without external docs (per [`CLI-MANIFEST.md`][ref-manifest] §4).

---

## 3. Non-Goals
- Interactive editing of layouts (drag/drop, manual nudging).
- Real-time collaboration or hosted service.
- Support for arbitrary diagram types beyond capability maps.
- Guaranteeing identical rendering across environments with different fonts unless fonts are explicitly supplied.

---

## 4. Primary Users & Use Cases
### Users
- Enterprise / domain architects producing capability maps for strategy and governance.
- Analysts generating periodic map updates from a canonical repository.
- DevOps/CI pipelines generating artefacts on every model change.
- **AI agents** orchestrating capability-map generation as part of larger workflows.

### Use Cases
- Generate a full capability map from a JSON export.
- Generate a **limited-depth** map (e.g., L0–L2) for executive presentations.
- Generate a map for a **subset of roots** (selected top-level capabilities).
- Apply a **theme** (colours, fonts, spacing) to match corporate style.
- Batch generation of multiple outputs in CI.
- **Agent-driven validation**: an agent calls `inspect` or `validate`, reads the structured envelope, fixes issues, and re-invokes `render` — all without parsing prose.

---

## 5. Scope (MVP)
### Inputs
- JSON file path (required), with optional stdin support.
- Optional theme/config file (JSON).

### Outputs
- Canonical: **SVG** (always available).
- Derived: **HTML**, **PNG**, **PDF**.

### Controls (MVP)
- Layout: gap, padding, target aspect ratio, alignment, header height, root spacing/margins.
- Model: max depth, sort mode, root selection.
- Export: output directory, file naming, PNG scale/DPI, PDF page size and margins.

---

## 6. System Overview
### End-to-End Pipeline
1) **Read input** (file or stdin)
2) **Parse JSON**
3) **Detect schema** (heuristics — see §7.2)
4) **Normalise** to internal model (see §7.3)
5) **Validate** and report issues (cycles, missing parents, duplicates)
6) **Layout** (compute sizes bottom-up, then positions top-down — see §8)
7) **Render** SVG + HTML wrapper (see §9)
8) **Export** PNG/PDF via Playwright (see §9.3)
9) **Write artefacts** + return structured summary envelope

### Key Architectural Decisions
- **SVG is the canonical render output.** HTML is an SVG wrapper. PNG/PDF are produced by rendering that HTML/SVG through headless Chromium.
- **Structured JSON envelope on stdout for every command** (see §10.4). stderr is for diagnostics only.
- **Layout algorithm is a separable, pure-function module** with no side effects — it receives a normalised tree and options, and returns sized/positioned nodes.

---

## 7. Import/Normalisation Requirements

> Derived from the schema detection and normalisation logic in [`Import Capabilities from JSON.ajs`][ref-import].

### 7.1 Supported JSON Shapes (MVP)
The importer SHALL accept at least these common shapes:

1) **Nested tree**
   - Each node contains a name-like field and a children array-like field.
   - May be a single root object or an array of root objects.

2) **Flat list with parent references**
   - Each item has a name-like field and a parent reference (by ID or name).

3) **Simple list (no hierarchy)**
   - Flat array of items; the harness treats all as roots.

The harness SHALL also support **wrapper objects** containing the data array under a property (e.g., `{ "capabilities": [...] }`). Unwrapping logic:
- If the root object has both a name field and a children field → treat as a single root node.
- If the root object has a children/array field but no name field → unwrap the array.
- Otherwise → find the first array-valued property and unwrap it (with a warning).

### 7.2 Schema Detection Heuristics
The importer SHALL apply heuristics to locate fields by checking preferred key names in priority order, falling back to structural inference. (Candidate lists sourced from [`Import Capabilities from JSON.ajs`][ref-import] `findNameField`, `findDescField`, `findChildrenField`, `findParentField`, `findIdField`.)

**Name field** — checked in order:
`name`, `title`, `label`, `capability`, `capabilityName`, `capability_name`; fallback: first string-valued field.

**Description field** — checked in order:
`description`, `desc`, `documentation`, `doc`, `summary`, `details`, `text`.

**Children field** — checked in order:
`children`, `subCapabilities`, `sub_capabilities`, `subcapabilities`, `capabilities`, `items`, `nodes`, `subs`, `sub`; fallback: first array-of-objects field.

**Parent reference field** — checked in order:
`parent`, `parentName`, `parent_name`, `parentId`, `parent_id`, `parentCapability`, `parent_capability`.

**ID field** — checked in order:
`id`, `ID`, `key`, `code`, `identifier`.

**Schema detection order:**
1. If any item has a children field → `nested`.
2. Else if any of the first 5 items has a parent field → `flat`.
3. Else → `simple`.

The harness SHALL allow **overriding** these via CLI options (`--nameField`, `--childrenField`, `--parentField`, `--idField`, `--descField`) to remove ambiguity.

### 7.3 Normalised Internal Model
After import, the harness SHALL normalise all inputs into a uniform node shape:

```typescript
interface CapabilityNode {
  id: string;            // synthetic if absent; deterministic (path + index)
  name: string;          // fallback: "-- unnamed --"
  description?: string;
  properties: Record<string, string | number | boolean>;  // extra scalar fields
  children: CapabilityNode[];
}
```

Notes:
- Extra properties SHALL include only scalar values to avoid bloating the model.
- A deterministic `id` strategy SHALL be used when IDs are missing (e.g., slugified path + sibling index) to keep output stable across runs.

### 7.4 Relationship and Hierarchy Rules
- In flat schemas, the harness SHALL resolve parent references by ID if `idField` is present, otherwise by name.
- Items whose parent cannot be resolved SHALL become roots (with a warning).
- The harness SHALL detect:
  - **Cycles** — fail with clear diagnostics including the cycle path.
  - **Multiple parents** — fail by default.
  - **Duplicate IDs** — fail.
- The harness SHALL produce a structured summary: node count, root count, max depth, warnings, errors.

---

## 8. Layout Algorithm (Detailed Specification)

> Ported from [`Build Capability Map.ajs`][ref-layout]. Default values sourced from [`capabilityMapDialog.js`][ref-dialog] `DEFAULTS`.

The layout algorithm is ported from the proven Archi/jArchi implementation. It SHALL be implemented as a separable, pure-function module.

### 8.1 Inputs
- Array of normalised tree roots (§7.3)
- Layout options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gap` | px | 8 | Space between sibling elements within a row |
| `padding` | px | 12 | Inset padding inside each container node |
| `headerHeight` | px | 40 | Vertical space reserved for the parent label |
| `rootGap` | px | 30 | Horizontal space between root trees |
| `viewMargin` | px | 20 | Outer margin around the entire map |
| `targetAspectRatio` | float | 1.6 | Preferred width:height ratio for containers |
| `alignment` | enum | `center` | Row alignment within containers: `left`, `center`, `right` |
| `maxDepth` | int\|`all` | `all` | Depth limit; nodes at this depth become effective leaves |
| `sortMode` | enum | `subtrees` | `alphabetical` — pure A-Z; `subtrees` — subtree children first (A-Z), then leaf children (A-Z) |
| `minLeafWidth` | px | 120 | Minimum leaf node width |
| `maxLeafWidth` | px | 200 | Maximum leaf node width |
| `leafHeight` | px | 45 | Fixed leaf node height |

### 8.2 Outputs
For every node:
- `size: { w: number, h: number }` — computed bounding box.
- `rows: RowMeta[]` — child row packing metadata (items, row width, row height, optional placements).
- `position: { x: number, y: number }` — absolute coordinates for rendering.

### 8.3 Algorithm Overview

The algorithm works **bottom-up** (sizing) then **top-down** (positioning).

#### Phase 1: Uniform Leaf Sizing
1. Walk all trees, identify every **effective leaf** (actual leaf or node at `maxDepth`).
2. Measure the text width of every effective leaf's name (using a font metrics provider for the configured font).
3. Compute uniform leaf width: `clamp(maxTextWidth + 2 * padding + 10, minLeafWidth, maxLeafWidth)`.
4. All effective leaves share this width and `leafHeight`.

#### Phase 2: Bottom-Up Size Computation (`calculateSize`)
(See [`Build Capability Map.ajs`][ref-layout] `calculateSize` function.)
For each node, recursively:
1. If effective leaf → assign uniform `{ w: leafWidth, h: leafHeight }` and return.
2. Compute sizes of all children (recurse).
3. Sort children per `sortMode`.
4. Separate children into **subtrees** (non-leaf) and **leaves** (effective leaf).
5. Choose layout strategy:
   - **Mixed** (subtrees + leaves) → `computeBandedFlowLayout` (§8.4).
   - **Homogeneous** (all subtrees or all leaves) → `computeFlowLayout` (§8.5).
6. Assign the winning layout's `{ w, h, rows }` to the node.

#### Phase 3: Top-Down Positioning
1. Arrange root trees horizontally: starting at `(viewMargin, viewMargin)`, advancing `x` by `tree.size.w + rootGap`.
2. For each non-leaf node, iterate its `rows`:
   - `y` starts at `headerHeight`, advances by `row.height + gap`.
   - Apply horizontal `alignment` offset per row.
   - If the row has explicit `placements` (from backfill — see §8.6), use those `(x, y)` offsets.
   - Otherwise, flow items left-to-right with `gap` spacing.

### 8.4 Banded Flow Layout (`computeBandedFlowLayout`)
(See [`Build Capability Map.ajs`][ref-layout] `computeBandedFlowLayout` function.)
Used when a node has **both** subtree children and leaf children.

1. Collect candidate target widths from both groups:
   - For k = 1..subtrees.length: width needed to fit the first k subtrees in one row.
   - For k = 1..leaves.length: width needed to fit the first k leaves in one row.
2. For each candidate width:
   a. Pack subtrees into rows using `packRows` (§8.5).
   b. **Backfill** remaining row space with leaves (§8.6).
   c. Pack any remaining leaves into additional rows.
   d. Score the combined layout (§8.7).
3. Return the layout with the lowest score.

### 8.5 Flow Layout (`computeFlowLayout` / `packRows`)
(See [`Build Capability Map.ajs`][ref-layout] `packRows` and `computeFlowLayout` functions.)
Used for homogeneous children or as a sub-routine.

**`packRows(children, targetWidth, options)`:**
- Content width = `targetWidth - 2 * padding`.
- Flow children left-to-right. When the next child would exceed content width, start a new row.
- Return `{ w, h, rows[] }` where `w = maxRowWidth + 2 * padding`, `h = headerHeight + sum(rowHeights) + gaps + padding`.

**`computeFlowLayout(children, options)`:**
- Try every possible first-row item count (k = 1..N): compute the target width that fits the first k children, pack all children at that width, score the result.
- Return the lowest-scoring layout.

### 8.6 Leaf Backfill (`backfillRowsWithLeaves`)
(See [`Build Capability Map.ajs`][ref-layout] `backfillRowsWithLeaves` function.)
After packing subtrees into rows, spare horizontal space is filled with leaves before creating extra leaf-only rows.

1. Iterate subtree rows **bottom-up** (lower rows tend to have the most spare space).
2. For each row, compute available width to the right of existing items.
3. Compute how many leaf **columns** fit in the available width.
4. Compute how many leaves can **stack vertically** within the row height (exploiting the tall subtree row).
5. Place leaves column-major: fill each column top-to-bottom before moving to the next column.
6. Update the row's width, height, items list, and explicit placement coordinates.
7. Return any leaves that did not fit.

### 8.7 Layout Scoring
(See [`Build Capability Map.ajs`][ref-layout] `scoreLayout` function.)
Score = lower is better. The scoring function balances five factors:

| Factor | Weight | Computation |
|--------|--------|-------------|
| **Aspect ratio** | 3.0 | `abs(layout.w / layout.h - targetAspectRatio)` |
| **Wasted space** | 2.0 | `1 - totalChildArea / containerArea` |
| **Row width variance** | 1.5 | RMS of `(1 - rowWidth / maxRowWidth)` across rows |
| **Row height variance** | 2.5 | Mean of `(maxH - minH) / maxH` per row (excluding intentional mixed-type rows) |
| **Last-row fill** | 1.0 | `max(0, 1 - lastRowWidth / firstRowWidth) * 0.5` (only when >1 row) |

Mixed rows (containing both subtrees and leaves) are **exempt** from the height-variance penalty because the height difference is intentional.

---

## 9. Rendering Requirements

### 9.1 SVG Rendering (Canonical)
The renderer SHALL generate a single SVG that:
- Contains `<rect>` elements for nodes and `<text>` elements for labels.
- Uses consistent coordinate units (px).
- Applies theme styling: fills, strokes, fonts, corner radii.
- Supports **per-depth colouring** for non-leaf nodes and a distinct leaf fill.
- Centres text on leaf nodes; top-aligns text on parent containers (so labels don't overlap children).
- Produces **deterministic element ordering** in the SVG output for stable diffs.

Default colour palette (from [`capabilityMapDialog.js`][ref-dialog] `DEFAULTS`):

| Level | Hex | Description |
|-------|-----|-------------|
| Leaf | `#E8E8E8` | Light grey |
| Depth 0 | `#D6E4F0` | Light blue |
| Depth 1 | `#D9EAD3` | Light green |
| Depth 2 | `#E1D5E7` | Light lavender |
| Depth 3 | `#FCE5CD` | Light peach |
| Depth 4 | `#FFF2CC` | Light yellow |
| Depth 5 | `#F4CCCC` | Light pink |

Default typography (from [`capabilityMapDialog.js`][ref-dialog] `DEFAULTS`):
- Parent nodes: Segoe UI, 9pt, bold.
- Leaf nodes: Segoe UI, 9pt, regular.

### 9.2 HTML Wrapper
The harness SHALL output an HTML file that:
- Embeds the SVG inline.
- Includes minimal CSS for background, centring, and print readiness.
- Is suitable as the render target for Playwright export.

### 9.3 Export via Playwright
- PNG export SHALL use a deterministic viewport and screenshot parameters.
- PDF export SHALL support:
  - page size presets (A4/Letter) and custom sizes
  - margins
  - scaling to fit content
- The harness SHOULD provide an option to supply fonts (path(s)) to reduce environment variability.

---

## 10. CLI Requirements

### 10.1 Agent-First Design Principles
The CLI SHALL follow the agent-first conventions defined in [`CLI-MANIFEST.md`][ref-manifest]:
- **Structured envelope** on stdout for every command (§10.4; Manifest §1).
- **Machine-readable error codes**, not just messages (§10.5; Manifest §2).
- **Distinct exit code ranges** per error category (§10.6; Manifest §3).
- **`guide` command** for zero-shot agent discovery (§10.3; Manifest §4).
- **TOON**: stdout is exclusively for the JSON envelope; diagnostics go to stderr (Manifest §7).
- **`LLM=true`** and **`isatty()`**: when stdout is not a TTY or `LLM=true` is set, suppress all decoration (Manifest §8). When stdout _is_ a TTY and `LLM=true` is not set, the CLI MAY add human-friendly formatting (colour, tables) as an overlay, but `--output json` always forces the structured envelope.

### 10.2 Commands (MVP)
Commands use a `noun verb` pattern where the noun is implicit (the tool _is_ the noun):

| Command | Mutates? | Description |
|---------|----------|-------------|
| `bcm render <input.json>` | Yes (writes files) | Full pipeline: import → layout → render → export |
| `bcm validate <input.json>` | No | Import + validate; report issues; no artefacts |
| `bcm inspect <input.json>` | No | Detect schema fields and produce a structured summary |
| `bcm guide` | No | Return full CLI schema, commands, flags, error codes, and examples as JSON |

### 10.3 The `guide` Command
`bcm guide` SHALL return a JSON object containing:
- **`commands`**: catalogue of all commands with their flags, input/output descriptions, and examples.
- **`error_codes`**: full taxonomy with exit code mapping and retry semantics.
- **`schema_version`**: current envelope schema version.
- **`defaults`**: all layout, sizing, and theme defaults.

This enables an agent to call `bcm guide` once and drive the CLI zero-shot.

### 10.4 Structured Response Envelope
Every command — success or failure — SHALL return the same top-level JSON shape on stdout (per [`CLI-MANIFEST.md`][ref-manifest] §1 "Every Command Returns a Structured Envelope"):

```jsonc
{
  "schema_version": "1.0",
  "request_id": "req_20260226_143000_7f3a",
  "ok": true,
  "command": "bcm.render",
  "result": { /* command-specific payload */ },
  "warnings": [],
  "errors": [],
  "metrics": {
    "duration_ms": 1420,
    "stages": {
      "import_ms": 12,
      "validate_ms": 3,
      "layout_ms": 45,
      "render_ms": 18,
      "export_ms": 1342
    }
  }
}
```

Invariants:
- `schema_version`, `request_id`, `ok`, `command`, `result`, `errors`, `warnings`, `metrics` are **always present**.
- `errors` and `warnings` are always arrays (possibly empty).
- `result` is always present; on failure use `null`.
- `request_id` also appears in stderr diagnostics for correlation.

**`render` result payload:**
```jsonc
{
  "artefacts": [
    { "type": "svg", "path": "/out/map.svg", "bytes": 24310 },
    { "type": "html", "path": "/out/map.html", "bytes": 25100 },
    { "type": "png", "path": "/out/map.png", "bytes": 184220 }
  ],
  "model_summary": {
    "nodes": 142,
    "roots": 3,
    "max_depth": 4
  },
  "layout_summary": {
    "total_width": 2400,
    "total_height": 1500,
    "leaf_size": { "w": 140, "h": 45 }
  }
}
```

**`inspect` result payload:**
```jsonc
{
  "detected_schema": "nested",
  "fields": {
    "name": "name",
    "description": "description",
    "children": "subCapabilities",
    "parent": null,
    "id": "id"
  },
  "model_summary": {
    "nodes": 142,
    "roots": 3,
    "max_depth": 4
  }
}
```

**`validate` result payload:**
```jsonc
{
  "valid": true,
  "model_summary": {
    "nodes": 142,
    "roots": 3,
    "max_depth": 4
  }
}
```

### 10.5 Error Codes
Errors carry a `code` (for machines) and a `message` (for humans). Agents branch on codes (per [`CLI-MANIFEST.md`][ref-manifest] §2).

```jsonc
{
  "code": "ERR_VALIDATION_CYCLE",
  "message": "Cycle detected: A → B → C → A",
  "details": { "cycle": ["A", "B", "C", "A"] },
  "retryable": false,
  "suggested_action": "fix_input"
}
```

**Error code taxonomy:**

| Code | Category | Retryable? | Suggested action |
|------|----------|-----------|------------------|
| `ERR_IO_FILE_NOT_FOUND` | I/O | No | `fix_input` |
| `ERR_IO_READ` | I/O | Yes | `retry` |
| `ERR_IO_WRITE` | I/O | Yes | `retry` |
| `ERR_VALIDATION_JSON_PARSE` | Validation | No | `fix_input` |
| `ERR_VALIDATION_SCHEMA_DETECT` | Validation | No | `fix_input` |
| `ERR_VALIDATION_NO_NAME_FIELD` | Validation | No | `fix_input` |
| `ERR_VALIDATION_EMPTY_INPUT` | Validation | No | `fix_input` |
| `ERR_VALIDATION_CYCLE` | Validation | No | `fix_input` |
| `ERR_VALIDATION_DUPLICATE_ID` | Validation | No | `fix_input` |
| `ERR_VALIDATION_MULTIPLE_PARENTS` | Validation | No | `fix_input` |
| `ERR_LAYOUT_FAILED` | Layout | No | `escalate` |
| `ERR_EXPORT_PLAYWRIGHT` | Export | Yes | `retry` |
| `ERR_EXPORT_BROWSER_LAUNCH` | Export | Yes | `retry` |
| `ERR_INTERNAL` | Internal | No | `escalate` |

### 10.6 Exit Codes
Exit codes use distinct ranges so shell scripts and CI can branch without parsing JSON (per [`CLI-MANIFEST.md`][ref-manifest] §3):

| Range | Category | Examples |
|-------|----------|----------|
| `0` | Success | — |
| `10` | Validation / input error | Bad JSON, missing fields, cycles, duplicates |
| `20` | Layout error | Algorithm failure |
| `30` | Render / export error | SVG generation failure, Playwright crash |
| `50` | I/O error | File not found, disk full, permission denied |
| `90` | Internal error / bug | Unexpected exception |

### 10.7 Key Options (MVP)

**Import:**
- `--nameField <key>`, `--descField <key>`, `--childrenField <key>`, `--parentField <key>`, `--idField <key>`
- `--unwrap <propertyName>` (explicit unwrapping)
- `--stdin` (read JSON from stdin instead of file)

**Model:**
- `--root <idOrName>` (repeatable; select specific roots)
- `--maxDepth <n|all>`
- `--sort <alpha|subtrees>`

**Layout:**
- `--gap <px>` (default: 8)
- `--padding <px>` (default: 12)
- `--headerHeight <px>` (default: 40)
- `--alignment <left|center|right>` (default: center)
- `--aspectRatio <float>` (default: 1.6)
- `--rootGap <px>` (default: 30)
- `--margin <px>` (default: 20)

**Leaf sizing:**
- `--leafHeight <px>` (default: 45)
- `--minLeafWidth <px>` (default: 120)
- `--maxLeafWidth <px>` (default: 200)

**Theme/Style:**
- `--theme <file>` (JSON theme file)
- `--font <name>` (default: Segoe UI)
- `--fontSize <px>` (default: 9)

**Outputs:**
- `--outDir <path>`
- `--svg` / `--no-svg`
- `--html`
- `--png`
- `--pdf`
- `--scale <float>` (PNG pixel density)
- `--pageSize <A4|Letter|WxH>` (PDF)
- `--pdfMargin <cssLikeValue>` (e.g., `10mm`)

**Diagnostics:**
- `--quiet` (envelope only on stdout; errors only on stderr)
- `--verbose` (envelope with extra diagnostics in result; full debug log on stderr)
- `--output json` (force structured output, even when stdout is a TTY)

---

## 11. Themes & Configuration

### 11.1 Theme File (MVP)
Theme config SHALL support:

```jsonc
{
  "palette": {
    "background": "#FFFFFF",
    "leafFill": "#E8E8E8",
    "depthFills": ["#D6E4F0", "#D9EAD3", "#E1D5E7", "#FCE5CD", "#FFF2CC", "#F4CCCC"],
    "border": "#CCCCCC"
  },
  "typography": {
    "parentFont": { "name": "Segoe UI", "size": 9, "style": "bold", "color": null },
    "leafFont": { "name": "Segoe UI", "size": 9, "style": "", "color": null }
  },
  "spacing": {
    "gap": 8,
    "padding": 12,
    "headerHeight": 40,
    "rootGap": 30,
    "viewMargin": 20
  },
  "display": {
    "cornerRadius": 4,
    "strokeWidth": 1
  }
}
```

CLI options SHALL override theme values. Theme values SHALL override built-in defaults.

Precedence: `CLI flags > theme file > built-in defaults`.

---

## 12. Non-Functional Requirements

### 12.1 Determinism
- Same input + options SHALL produce the same layout coordinates and SVG structure, given consistent fonts.
- The `request_id` in the envelope is unique per invocation but does not affect output content.

### 12.2 Performance
- The harness SHOULD handle thousands of nodes with acceptable runtime.
- Export time is expected to be dominated by PNG/PDF generation via Playwright.
- The harness SHALL report per-stage timings in the `metrics` field of the response envelope.

### 12.3 Robust Diagnostics
- Errors MUST include:
  - Machine-readable `code` (for agents) and `message` (for humans).
  - `details` object with structured context (cycle path, duplicate key, missing parent reference).
  - `retryable` flag and `suggested_action`.
- Warnings SHOULD be emitted (in the `warnings` array) for:
  - Missing names (placeholder used).
  - Unresolved parents (promoted to root).
  - Ignored non-scalar properties.
  - Wrapper object auto-unwrapped.

### 12.4 Portability
- Supports Windows/macOS/Linux.
- Document Playwright runtime expectations for CI containers.

### 12.5 Agent Compatibility
Per [`CLI-MANIFEST.md`][ref-manifest] §§7–8:
- Respect `LLM=true` environment variable: suppress banners, spinners, interactive prompts, and decoration.
- Check `isatty(stdout)`: when piped, default to structured-only output.
- Never block on interactive prompts; return structured errors instead.
- Output-mode precedence: `--output flag > LLM=true / CI=true > isatty() default`.

---

## 13. Acceptance Criteria (MVP)
1) **Schema-flexible import**: at least the three shapes (nested, flat, simple) are accepted and normalised correctly.
2) **Validation**: cycles and duplicates fail with structured error codes; unresolved parents warn and continue.
3) **Layout**: output is legible, reasonably compact, stable across runs, and matches the scoring algorithm specification.
4) **Exports**: SVG + HTML always; PNG/PDF generated when requested and visually match HTML.
5) **CLI ergonomics**: `validate` and `inspect` help users (and agents) correct data issues without rendering.
6) **Structured envelope**: every command returns the standard JSON envelope on stdout.
7) **`guide` command**: returns complete CLI schema as JSON; an agent can drive the CLI zero-shot from this output.
8) **Error codes**: all failure modes return machine-readable codes with retry semantics.

---

## 14. Testing Strategy
- **Unit tests:**
  - Schema detection heuristics (all candidate field names) and override behaviour.
  - Normalisation correctness for all three schema types + wrapper unwrapping.
  - Cycle, duplicate-ID, and multiple-parent detection.
  - Layout invariants: uniform leaf sizing, row packing, scoring weights, banded-flow backfill, alignment.
  - Envelope structure: `ok`, `errors`, `warnings`, `metrics` are always present and typed correctly.
- **Golden tests:**
  - Snapshot SVG comparisons for representative fixtures.
  - Snapshot envelope comparisons for `inspect` and `validate`.
- **Integration tests:**
  - Playwright export for PNG/PDF on CI.
  - Cross-platform smoke tests (Windows, macOS, Linux).
  - Exit-code verification for each error category.
  - `guide` output schema validation.

---

## 15. Delivery Milestones (Indicative)
1) CLI scaffold + JSON parsing + structured envelope + `guide` + `inspect` + `validate`
2) Normaliser + diagnostics + error codes + fixtures
3) Layout module + SVG renderer + golden tests
4) HTML wrapper + Playwright export + themes + packaging + documentation

---

## Appendix A: Reference Material

| File | Role in this PRD |
|------|------------------|
| [`context/archi-src/Build Capability Map.ajs`][ref-layout] | Canonical reference for the adaptive flow layout algorithm: `packRows`, `computeFlowLayout`, `computeBandedFlowLayout`, `backfillRowsWithLeaves`, `scoreLayout`, `calculateSize`, and `addNode` positioning logic. All layout defaults, scoring weights, and behavioural rules in §8 are derived from this file. |
| [`context/archi-src/Import Capabilities from JSON.ajs`][ref-import] | Canonical reference for JSON schema detection: `findNameField`, `findDescField`, `findChildrenField`, `findParentField`, `findIdField`, `detectSchema`, `normalizeNode`, `buildTreeFromFlat`. The field candidate lists in §7.2, schema detection order in §7.2, wrapper unwrapping logic in §7.1, and normalised model in §7.3 are derived from this file. |
| [`context/archi-src/capabilityMapDialog.js`][ref-dialog] | Canonical reference for configuration defaults: `DEFAULTS` object (spacing, leaf sizing, aspect ratio, sort modes, alignment, colours, fonts). The default values in §8.1, §9.1 colour palette, §9.1 typography, and §11.1 theme schema are derived from this file. |
| [`context/CLI-MANIFEST.md`][ref-manifest] | Design guide for agent-first CLI conventions. The structured envelope (§10.4), error code taxonomy (§10.5), exit code ranges (§10.6), `guide` command (§10.3), TOON principle (§10.1), `LLM=true` support (§12.5), and observability requirements (§12.2) are derived from Parts I–II of this manifest. |

[ref-layout]: archi-src/Build%20Capability%20Map.ajs
[ref-import]: archi-src/Import%20Capabilities%20from%20JSON.ajs
[ref-dialog]: archi-src/capabilityMapDialog.js
[ref-manifest]: CLI-MANIFEST.md
