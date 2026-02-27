import { successEnvelope } from "../envelope.js";
import { DEFAULT_LAYOUT_OPTIONS, DEFAULT_THEME, SCHEMA_VERSION } from "../../core/defaults.js";
import { ErrorCode, exitCodeForError, isRetryable, suggestedAction } from "../errors.js";
import {
  NAME_CANDIDATES, DESC_CANDIDATES, CHILDREN_CANDIDATES,
  PARENT_CANDIDATES, ID_CANDIDATES,
} from "../../import/fields.js";
import type { Envelope, FlagMeta } from "../../core/types.js";

const IMPORT_FLAGS: Record<string, FlagMeta> = {
  "--nameField": { type: "string", description: "Override auto-detected name field" },
  "--descField": { type: "string", description: "Override auto-detected description field" },
  "--childrenField": { type: "string", description: "Override auto-detected children field" },
  "--parentField": { type: "string", description: "Override auto-detected parent field" },
  "--idField": { type: "string", description: "Override auto-detected ID field" },
  "--unwrap": { type: "string", description: "Explicit property to unwrap from wrapper object" },
  "--stdin": { type: "boolean", default: false, description: "Read JSON from stdin instead of file" },
  "--root": { type: "string[]", description: "Select specific root by ID or name (repeatable)" },
};

const DIAGNOSTIC_FLAGS: Record<string, FlagMeta> = {
  "--quiet": { type: "boolean", default: false, description: "Envelope only on stdout; errors only on stderr" },
  "--verbose": { type: "boolean", default: false, description: "Extra diagnostics in result and full debug on stderr" },
  "--output": { type: "string", default: "json", choices: ["json"], description: "Force output format" },
};

export function runGuide(requestId: string): { envelope: Envelope<unknown>; exitCode: number } {
  const errorCodes: Record<string, { exit_code: number; retryable: boolean; suggested_action: string }> = {};
  for (const code of Object.values(ErrorCode)) {
    errorCodes[code] = {
      exit_code: exitCodeForError(code as ErrorCode),
      retryable: isRetryable(code as ErrorCode),
      suggested_action: suggestedAction(code as ErrorCode),
    };
  }

  const result = {
    schema_version: SCHEMA_VERSION,
    commands: {
      "bcm.render": {
        description: "Full pipeline: import → layout → render → export",
        args: ["[input.json]"],
        mutates: true,
        flags: {
          ...IMPORT_FLAGS,
          "--maxDepth": { type: "string", default: "-1", description: "Maximum depth to render (-1 or 'all' for unlimited)" },
          "--sort": { type: "string", default: "subtrees", choices: ["subtrees", "alphabetical"], description: "Sort mode" },
          "--gap": { type: "string", default: "8", description: "Element gap in px" },
          "--padding": { type: "string", default: "12", description: "Container padding in px" },
          "--headerHeight": { type: "string", default: "40", description: "Header height in px" },
          "--alignment": { type: "string", default: "center", choices: ["left", "center", "right"], description: "Row alignment" },
          "--aspectRatio": { type: "string", default: "1.6", description: "Target aspect ratio" },
          "--rootGap": { type: "string", default: "30", description: "Gap between root trees" },
          "--margin": { type: "string", default: "20", description: "View margin in px" },
          "--leafHeight": { type: "string", default: "45", description: "Leaf node height" },
          "--minLeafWidth": { type: "string", default: "120", description: "Minimum leaf width" },
          "--maxLeafWidth": { type: "string", default: "200", description: "Maximum leaf width" },
          "--theme": { type: "string", description: "Theme JSON file path" },
          "--font": { type: "string", default: "Segoe UI", description: "Font name" },
          "--fontSize": { type: "string", default: "9", description: "Font size in pt" },
          "--outDir": { type: "string", default: ".", description: "Output directory" },
          "--svg": { type: "boolean", default: true, description: "Output SVG file" },
          "--no-svg": { type: "boolean", description: "Skip SVG output" },
          "--html": { type: "boolean", default: false, description: "Output HTML file" },
          "--png": { type: "boolean", default: false, description: "Output PNG file" },
          "--pdf": { type: "boolean", default: false, description: "Output PDF file" },
          "--scale": { type: "string", default: "2", description: "PNG pixel density scale" },
          "--pageSize": { type: "string", default: "A4", description: "PDF page size (A4, Letter, WxH)" },
          "--pdfMargin": { type: "string", default: "10mm", description: "PDF margins" },
          "--dry-run": { type: "boolean", default: false, description: "Compute layout without writing files" },
          ...DIAGNOSTIC_FLAGS,
        },
      },
      "bcm.validate": {
        description: "Import + validate; report issues; no artefacts",
        args: ["[input.json]"],
        mutates: false,
        flags: { ...IMPORT_FLAGS, ...DIAGNOSTIC_FLAGS },
      },
      "bcm.inspect": {
        description: "Detect schema fields and produce a structured summary",
        args: ["[input.json]"],
        mutates: false,
        flags: { ...IMPORT_FLAGS, ...DIAGNOSTIC_FLAGS },
      },
      "bcm.guide": {
        description: "Return full CLI schema, commands, flags, error codes, and examples as JSON",
        args: [],
        mutates: false,
        flags: {},
      },
    },
    examples: [
      { command: "bcm render data.json --outDir out --svg", description: "Render a capability map to SVG" },
      { command: "bcm render data.json --outDir out --svg --html --png", description: "Export to SVG, HTML, and PNG" },
      { command: "bcm validate data.json", description: "Validate input JSON without rendering" },
      { command: "bcm inspect data.json", description: "Detect schema and field mappings" },
      { command: "cat data.json | bcm render --stdin --outDir out --svg", description: "Pipe JSON via stdin" },
      { command: "bcm render data.json --root \"Customer Management\" --outDir out --svg", description: "Render a specific root subtree" },
    ],
    error_codes: errorCodes,
    defaults: {
      layout: DEFAULT_LAYOUT_OPTIONS,
      theme: DEFAULT_THEME,
    },
    input_schemas: {
      description: "BCM accepts JSON arrays of capability objects. Three schema layouts are auto-detected.",
      field_detection: {
        name:        { candidates: NAME_CANDIDATES, fallback: "first string-valued field", required: true },
        description: { candidates: DESC_CANDIDATES, fallback: null, required: false },
        children:    { candidates: CHILDREN_CANDIDATES, fallback: "first field with array of objects", required: false },
        parent:      { candidates: PARENT_CANDIDATES, fallback: null, required: false },
        id:          { candidates: ID_CANDIDATES, fallback: null, required: false },
      },
      schemas: {
        nested: {
          description: "Hierarchical tree using a children array field on each node",
          detection: "An item contains a recognized children field",
          example: [
            { name: "Customer Management", description: "All customer capabilities", children: [
              { name: "Onboarding", description: "New customer setup" },
              { name: "Support", description: "Customer support" },
            ]},
          ],
        },
        flat: {
          description: "Flat list with parent references that BCM assembles into a tree",
          detection: "An item contains a recognized parent field",
          example: [
            { id: "1", name: "Customer Management", parent_id: null },
            { id: "2", name: "Onboarding", parent_id: "1" },
            { id: "3", name: "Support", parent_id: "1" },
          ],
        },
        simple: {
          description: "Plain array of items rendered as flat leaf nodes",
          detection: "No children or parent fields detected",
          example: [
            { name: "Onboarding" },
            { name: "Support" },
            { name: "Billing" },
          ],
        },
      },
      wrapper_support: "If input is an object (not array), bcm auto-unwraps the first array-valued property. Use --unwrap to specify explicitly.",
    },
  };

  return {
    envelope: successEnvelope("bcm.guide", result, { request_id: requestId }),
    exitCode: 0,
  };
}
