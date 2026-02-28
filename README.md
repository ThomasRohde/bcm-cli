# bcm-cli

[![version](https://img.shields.io/badge/version-1.0.8-blue)](https://github.com/ThomasRohde/bcm-cli)

A CLI tool for rendering **Business Capability Maps** from JSON or CSV data into SVG, HTML, PNG, and PDF.

Designed to be agent-friendly: all output is structured JSON, making it easy to integrate with LLM agents, CI pipelines, and automation scripts.

## What is Business Capability Modeling?

A **Business Capability Model (BCM)** describes *what* an organisation must be able to do — its enduring abilities — independent of *how* it does it (processes), *who* does it (teams), or *with what* (systems and technology). Because capabilities describe outcomes rather than implementation, a well-built BCM is stable over time: it survives re-orgs, system replacements, and strategy pivots.

Capabilities are organised into a hierarchy:

- **Level 1** — broad domains (e.g., "Customer Management", "Financial Management")
- **Level 2** — functional areas within a domain (e.g., "Customer Onboarding", "Customer Retention")
- **Level 3** — concrete, leaf-level capabilities (e.g., "Identity Verification", "Welcome Communications")

BCMs are used for strategic planning, investment prioritisation, gap analysis, and aligning technology to business outcomes. `bcm` turns a capability model — written as JSON or CSV — into a visual map in seconds.

## Installation

```bash
npm install -g @trohde/bcm-cli
```

Or use directly with npx:

```bash
npx @trohde/bcm-cli render capabilities.json --outDir ./out
```

### Optional: PNG/PDF Export

For PNG and PDF output, install Playwright:

```bash
npm install -g playwright
npx playwright install chromium
```

## Quick Start

### 1. Create a capability model

**Nested JSON** (children embedded in each node):

```json
[
  {
    "name": "Customer Management",
    "children": [
      { "name": "Customer Onboarding" },
      { "name": "Customer Support" },
      { "name": "Customer Analytics" }
    ]
  },
  {
    "name": "Product Management",
    "children": [
      { "name": "Product Development" },
      { "name": "Product Marketing" }
    ]
  }
]
```

**CSV with levels** (hierarchy inferred automatically from the `level` column):

```csv
id,name,level,description
enterprise,Enterprise,L1,Root enterprise capability
cm,Customer Management,L2,Managing customers
co,Customer Onboarding,L3,Onboarding new customers
cr,Customer Retention,L3,Retaining existing customers
pm,Product Management,L2,Managing products
pd,Product Development,L3,Developing new products
pp,Product Pricing,L3,Setting product prices
```

### 2. Render it

```bash
bcm render capabilities.json --outDir ./out --svg --html
bcm render capabilities.csv --outDir ./out --svg --html
```

### 3. Output

The CLI writes artefacts to the output directory and prints a structured JSON envelope to stdout:

```json
{
  "ok": true,
  "result": {
    "model_summary": { "nodes": 7, "roots": 2, "max_depth": 1 },
    "artefacts": [
      { "type": "svg", "path": "out/capabilities.svg", "bytes": 2169 },
      { "type": "html", "path": "out/capabilities.html", "bytes": 2450 }
    ]
  }
}
```

## Commands

### `bcm render <file>`

Full pipeline: import, layout, render, and export.

```bash
bcm render model.json --outDir ./out --svg --html --png --pdf
bcm render model.csv --outDir ./out --html
bcm render model.json --outDir ./out --dry-run    # Compute layout without writing files
```

### `bcm validate <file>`

Import and validate the model without rendering.

```bash
bcm validate model.json
bcm validate model.csv
```

### `bcm inspect <file>`

Detect schema type, fields, and model summary.

```bash
bcm inspect model.json
bcm inspect data.csv
```

### `bcm guide`

Print the full CLI schema (commands, flags, error codes, defaults, and input schemas) as JSON. Useful for LLM agents to understand the CLI interface.

```bash
bcm guide
```

### `bcm skill`

Print BCM modelling guidance as markdown. Designed to be loaded into an LLM agent's context so it can generate well-structured capability models.

```bash
bcm skill
```

## Input Formats

The CLI auto-detects the input format from the file extension (`.json`, `.csv`, `.tsv`) or you can specify it explicitly with `--format`.

### JSON Schemas

JSON schemas are auto-detected from the data shape:

| Schema | Detection | Description |
|--------|-----------|-------------|
| **Nested** | Items have a `children` array | Tree structure with embedded children |
| **Flat** | Items have a `parent` / `parent_id` field | Flat list with parent references |
| **Simple** | Neither children nor parent fields | Flat list rendered as leaf nodes |

**Nested format:**

```json
[
  {
    "name": "Customer Management",
    "children": [
      { "name": "Customer Onboarding" },
      { "name": "Customer Support" }
    ]
  }
]
```

**Flat format** (parent references by ID or name):

```json
[
  { "id": "1", "name": "Sales", "parent_id": null },
  { "id": "2", "name": "Lead Generation", "parent_id": "1" },
  { "id": "3", "name": "Opportunity Management", "parent_id": "1" }
]
```

**Simple list** (no hierarchy):

```json
[
  { "name": "Data Governance" },
  { "name": "Cloud Architecture" },
  { "name": "Security Operations" }
]
```

### CSV / TSV

CSV and TSV files are parsed with full RFC 4180 support (quoted fields, embedded newlines, escaped quotes). Hierarchy is determined by the columns present:

| Columns present | Behaviour |
|-----------------|-----------|
| `parent` column | Treated as flat schema (parent references) |
| `level` column (L1/L2/L3 or 1/2/3) | Hierarchy auto-inferred from levels |
| Neither | Flat list of leaf nodes |

**CSV with parent references:**

```csv
id,name,description,parent
root,Enterprise,Root capability,
cm,Customer Management,Managing customers,root
co,Customer Onboarding,Onboarding new customers,cm
```

**CSV with level-based hierarchy:**

```csv
id,name,level,description
enterprise,Enterprise,L1,Root enterprise capability
cm,Customer Management,L2,Managing customers
co,Customer Onboarding,L3,Onboarding new customers
```

**Simple CSV list:**

```csv
name,description
Customer Management,Managing customers
Product Management,Managing products
```

### Field Auto-Detection

Field names are auto-detected from common conventions:

- **Name:** `name`, `title`, `label`, `capability`, `capabilityName`, `capability_name`
- **Description:** `description`, `desc`, `documentation`, `doc`, `summary`, `details`, `text`
- **Children:** `children`, `subCapabilities`, `sub_capabilities`, `capabilities`, `items`, `nodes`
- **Parent:** `parent`, `parentName`, `parent_name`, `parentId`, `parent_id`
- **ID:** `id`, `ID`, `key`, `code`, `identifier`
- **Level:** `level`, `Level`, `depth`, `tier`, `hierarchy_level`

Override auto-detection with explicit field flags:

```bash
bcm render model.json --nameField capability_title --childrenField sub_items
bcm render model.csv --levelField depth --nameField title
```

### Wrapper Objects

The CLI automatically unwraps common JSON patterns:

```json
{ "data": [{ "name": "..." }] }
{ "capabilities": { "name": "Root", "children": [...] } }
```

Or specify the property to unwrap:

```bash
bcm render model.json --unwrap data
```

### Root Selection

Render only specific subtrees by ID or name:

```bash
bcm render model.json --root "Customer Management" --outDir ./out
bcm render model.json --root cm --root pm --outDir ./out
```

## Layout Options

```bash
bcm render model.json \
  --aspectRatio 1.6 \          # Target width/height ratio (default: 1.6)
  --sort subtrees \             # Sort: "subtrees" (default) or "alphabetical"
  --alignment center \          # Alignment: "left", "center" (default), "right"
  --gap 8 \                     # Gap between siblings (px, default: 8)
  --padding 12 \                # Container padding (px, default: 12)
  --headerHeight 48 \           # Container header height (px, default: 48)
  --rootGap 30 \                # Gap between root nodes (px, default: 30)
  --margin 20 \                 # Viewport margin (px, default: 20)
  --leafHeight 55 \             # Leaf node height (px, default: 55)
  --minLeafWidth 120 \          # Minimum leaf width (px, default: 120)
  --maxLeafWidth 200 \          # Maximum leaf width (px, default: 200)
  --maxDepth 3                  # Max render depth (-1 = unlimited, default: -1)
```

## Theme

Apply a custom theme via JSON file:

```bash
bcm render model.json --theme my-theme.json
```

**Theme file structure:**

```json
{
  "palette": {
    "background": "#FFFFFF",
    "leafFill": "#E8E8E8",
    "depthFills": ["#D6E4F0", "#D9EAD3", "#E1D5E7", "#FCE5CD", "#FFF2CC", "#F4CCCC"],
    "border": "#CCCCCC"
  },
  "typography": {
    "parentFont": { "name": "Segoe UI", "size": 13, "style": "bold" },
    "leafFont": { "name": "Segoe UI", "size": 11, "style": "" }
  },
  "spacing": {
    "gap": 8,
    "padding": 12,
    "headerHeight": 48,
    "rootGap": 30,
    "viewMargin": 20,
    "minLeafWidth": 120,
    "maxLeafWidth": 200,
    "leafHeight": 55
  },
  "display": {
    "cornerRadius": 4,
    "strokeWidth": 1
  }
}
```

CLI flags override theme file values:

```bash
bcm render model.json --theme dark.json --font "Arial" --fontSize 10
```

## Export Options

```bash
bcm render model.json --outDir ./out \
  --svg \                       # SVG output (default: enabled)
  --html \                      # Interactive HTML with search, zoom, and pan
  --png --scale 2 \             # PNG at 2x pixel density (requires Playwright)
  --pdf --pageSize A4 --pdfMargin 10mm   # PDF (requires Playwright)
```

### HTML Output Features

The HTML export produces a self-contained interactive viewer:

- **Full-text search** with BM25 ranking — find capabilities by name or description
- **Zoom and pan** — mouse wheel to zoom, drag to pan, fit-to-view button
- **Click to inspect** — click any node to see its description rendered as markdown
- **Dark mode support** with glassmorphism UI
- **Responsive** — works on any screen size

## Structured Output

Every command returns a JSON envelope on stdout:

```json
{
  "schema_version": "1.0",
  "request_id": "req_20260226_120000_a1b2",
  "ok": true,
  "command": "bcm.render",
  "result": { ... },
  "warnings": [],
  "errors": [],
  "metrics": {
    "duration_ms": 42,
    "stages": {
      "import_ms": 2,
      "layout_ms": 15,
      "render_ms": 8,
      "export_ms": 17
    }
  }
}
```

### Error Handling

Errors include machine-readable codes, retryability hints, and suggested actions:

```json
{
  "ok": false,
  "errors": [{
    "code": "ERR_VALIDATION_CYCLE",
    "message": "Cycle detected in parent references: A -> B -> C -> A",
    "retryable": false,
    "suggested_action": "fix_input"
  }]
}
```

### Exit Codes

| Code | Category | Examples |
|------|----------|---------|
| `0` | Success | |
| `10` | Validation | Cycle, duplicate IDs, bad JSON/CSV, empty input |
| `20` | Layout | Layout computation failure |
| `30` | Export | Playwright/browser errors |
| `50` | I/O | File not found, read/write errors |
| `90` | Internal | Unexpected errors |

## Using bcm with an AI Agent

`bcm` is built from the ground up for AI agent workflows. Here is how to use it with an agent like Claude Code.

### 1. Load the modelling guidance

The `bcm skill` command outputs structured BCM modelling guidance as markdown. An agent can load this into its context to understand how to build well-structured capability models:

```bash
bcm skill
```

This teaches the agent:
- How to structure capabilities (L1 domains, L2 areas, L3 leaf capabilities)
- The recommended CSV output format with `id`, `name`, `level`, `category`, and `description` columns
- Description templates with Includes/Excludes/Business outcomes/Key information sections
- MECE (Mutually Exclusive, Collectively Exhaustive) principles for capability decomposition

### 2. Discover the CLI interface

The `bcm guide` command returns the full CLI schema as structured JSON — every command, flag, default, error code, and input schema:

```bash
bcm guide
```

An agent can parse this to understand exactly what options are available without guessing.

### 3. Generate, validate, and render

A typical agent workflow looks like this:

```bash
# Step 1: Agent generates a capability model as CSV
# (The agent writes a CSV file based on the skill guidance)

# Step 2: Validate the model
bcm validate model.csv

# Step 3: Render to HTML for interactive exploration
bcm render model.csv --outDir ./out --html

# Step 4: Check the result
# The JSON envelope on stdout tells the agent exactly what was produced
```

### 4. Agent mode

Agent mode is auto-detected when `LLM=true`, `CI=true`, or stdout is not a TTY. In agent mode, stderr diagnostics are suppressed and only the structured JSON envelope is emitted:

```bash
LLM=true bcm render model.csv --outDir ./out --html
```

### 5. Pipe from stdin

Agents can generate JSON on the fly and pipe it directly:

```bash
cat model.json | bcm render --stdin --outDir ./out --svg
```

### Example: Claude Code workflow

Here is a concrete example of using `bcm` with Claude Code:

```
You: "Create a business capability model for a fintech startup"

Claude Code:
  1. Reads `bcm skill` to learn BCM best practices
  2. Generates a CSV with L1–L3 capabilities
  3. Runs `bcm validate model.csv` to check for issues
  4. Runs `bcm render model.csv --outDir ./out --html` to produce an interactive map
  5. Opens the HTML file for you to review
  6. Iterates based on your feedback
```

The structured JSON output means the agent always knows whether the command succeeded, what files were produced, and what to fix if something went wrong.

## Development

```bash
git clone https://github.com/ThomasRohde/bcm-cli.git
cd bcm-cli
pnpm install
pnpm build
pnpm test
```

### Running locally

```bash
node dist/index.js render test/fixtures/nested-simple.json --outDir ./out --svg --html
node dist/index.js render test/fixtures/level-hierarchy.csv --outDir ./out --html
```

## License

MIT
