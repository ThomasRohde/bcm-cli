# bcm-cli

[![version](https://img.shields.io/badge/version-1.0.4-blue)](https://github.com/ThomasRohde/bcm-cli)

A CLI tool for rendering **Business Capability Maps** from JSON data into SVG, HTML, PNG, and PDF.

Designed to be agent-friendly: all output is structured JSON, making it easy to integrate with LLM agents, CI pipelines, and automation scripts.

## Installation

```bash
npm install -g bcm-cli
```

Or use directly with npx:

```bash
npx bcm-cli render capabilities.json --outDir ./out
```

### Optional: PNG/PDF Export

For PNG and PDF output, install Playwright:

```bash
npm install -g playwright
npx playwright install chromium
```

## Quick Start

### 1. Create a capability model

**Nested format** (children embedded in each node):

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

**Flat format** (parent references by ID):

```json
[
  { "id": "1", "name": "Sales", "parent_id": null },
  { "id": "2", "name": "Lead Generation", "parent_id": "1" },
  { "id": "3", "name": "Opportunity Management", "parent_id": "1" },
  { "id": "4", "name": "Marketing", "parent_id": null },
  { "id": "5", "name": "Campaign Management", "parent_id": "4" }
]
```

**Simple list** (flat list, no hierarchy):

```json
[
  { "name": "Data Governance" },
  { "name": "Cloud Architecture" },
  { "name": "Security Operations" }
]
```

### 2. Render it

```bash
bcm render capabilities.json --outDir ./out --svg --html
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
bcm render model.json --outDir ./out --dry-run    # Compute layout without writing files
```

### `bcm validate <file>`

Import and validate the model without rendering.

```bash
bcm validate model.json
```

### `bcm inspect <file>`

Detect schema type, fields, and model summary.

```bash
bcm inspect model.json
```

### `bcm guide`

Print the full CLI schema (commands, flags, error codes, defaults, and input schemas) as JSON. Useful for LLM agents to understand the CLI interface.

```bash
bcm guide
```

## Input Formats

The CLI auto-detects the input format:

| Format | Detection | Description |
|--------|-----------|-------------|
| **Nested** | Items have a `children` array | Tree structure with embedded children |
| **Flat** | Items have a `parent` / `parent_id` field | Flat list with parent references |
| **Simple** | Neither children nor parent fields | Flat list rendered as leaf nodes |

### Field Auto-Detection

Field names are auto-detected from common conventions:

- **Name:** `name`, `title`, `label`, `capability`, `capabilityName`, `capability_name`
- **Description:** `description`, `desc`, `documentation`, `doc`, `summary`, `details`, `text`
- **Children:** `children`, `subCapabilities`, `sub_capabilities`, `subcapabilities`, `capabilities`, `items`, `nodes`, `subs`, `sub`
- **Parent:** `parent`, `parentName`, `parent_name`, `parentId`, `parent_id`, `parentCapability`, `parent_capability`
- **ID:** `id`, `ID`, `key`, `code`, `identifier`

Override auto-detection with explicit field flags:

```bash
bcm render model.json --nameField capability_title --childrenField sub_items
```

### Wrapper Objects

The CLI automatically unwraps common patterns:

```json
{ "data": [{ "name": "..." }] }
{ "capabilities": { "name": "Root", "children": [...] } }
```

Or specify the property to unwrap:

```bash
bcm render model.json --unwrap data
```

## Layout Options

```bash
bcm render model.json \
  --aspectRatio 1.6 \          # Target width/height ratio (default: 1.6)
  --sort subtrees \             # Sort: "subtrees" (default) or "alphabetical"
  --alignment center \          # Alignment: "left", "center" (default), "right"
  --gap 8 \                     # Gap between siblings (px, default: 8)
  --padding 12 \                # Container padding (px, default: 12)
  --headerHeight 40 \           # Container header height (px, default: 40)
  --rootGap 30 \                # Gap between root nodes (px, default: 30)
  --margin 20 \                 # Viewport margin (px, default: 20)
  --leafHeight 45 \             # Leaf node height (px, default: 45)
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
    "parentFont": { "name": "Segoe UI", "size": 9, "style": "bold" },
    "leafFont": { "name": "Segoe UI", "size": 9, "style": "" }
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

CLI flags override theme file values:

```bash
bcm render model.json --theme dark.json --font "Arial" --fontSize 10
```

## Export Options

```bash
bcm render model.json --outDir ./out \
  --svg \                       # SVG output (default: enabled)
  --html \                      # HTML wrapper with embedded SVG
  --png --scale 2 \             # PNG at 2x pixel density (requires Playwright)
  --pdf --pageSize A4 --pdfMargin 10mm   # PDF (requires Playwright)
```

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
| `10` | Validation | Cycle, duplicate IDs, bad JSON, empty input |
| `20` | Layout | Layout computation failure |
| `30` | Export | Playwright/browser errors |
| `50` | I/O | File not found, read/write errors |
| `90` | Internal | Unexpected errors |

## Agent Integration

The CLI is designed for LLM agent use:

```bash
# Agent discovers CLI capabilities
bcm guide | jq .result.commands

# Agent validates input before rendering
bcm validate model.json && bcm render model.json --outDir ./out

# Pipe from stdin
cat model.json | bcm render --stdin --outDir ./out

# Detect agent mode automatically (suppresses stderr diagnostics)
LLM=true bcm render model.json --outDir ./out
```

Agent mode is auto-detected when `LLM=true`, `CI=true`, or stdout is not a TTY.

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
```

## License

MIT
