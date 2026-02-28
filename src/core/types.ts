// ---------------------------------------------------------------------------
// Capability model types
// ---------------------------------------------------------------------------

export interface CapabilityNode {
  id: string;
  name: string;
  description?: string;
  properties: Record<string, string | number | boolean>;
  children: CapabilityNode[];
}

export type SchemaType = "nested" | "flat" | "simple";

export interface DetectedFields {
  name: string | null;
  description: string | null;
  children: string | null;
  parent: string | null;
  id: string | null;
  level?: string | null;
}

export interface ModelSummary {
  nodes: number;
  roots: number;
  max_depth: number;
}

// ---------------------------------------------------------------------------
// Layout types
// ---------------------------------------------------------------------------

export interface Size {
  w: number;
  h: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Placement {
  item: LayoutNode;
  x: number;
  y: number;
}

export interface RowMeta {
  items: LayoutNode[];
  height: number;
  width: number;
  placements?: Placement[];
}

export interface LayoutNode {
  id: string;
  name: string;
  description?: string;
  children: LayoutNode[];
  size: Size;
  rows: RowMeta[];
  position: Position;
  depth: number;
  _effectiveLeaf: boolean;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  totalWidth: number;
  totalHeight: number;
  leafSize: Size;
}

export interface PackResult {
  w: number;
  h: number;
  rows: RowMeta[];
}

// ---------------------------------------------------------------------------
// Options types
// ---------------------------------------------------------------------------

export interface LayoutOptions {
  gap: number;
  padding: number;
  headerHeight: number;
  rootGap: number;
  viewMargin: number;
  aspectRatio: number;
  alignment: "left" | "center" | "right";
  maxDepth: number; // -1 = all
  sortMode: "subtrees" | "alphabetical";
  minLeafWidth: number;
  maxLeafWidth: number;
  leafHeight: number;
}

export interface FontConfig {
  name: string;
  size: number;
  style: string;
  color: string | null;
}

export interface ThemeConfig {
  palette: {
    background: string;
    leafFill: string;
    depthFills: string[];
    border: string;
  };
  typography: {
    parentFont: FontConfig;
    leafFont: FontConfig;
  };
  spacing: {
    gap: number;
    padding: number;
    headerHeight: number;
    rootGap: number;
    viewMargin: number;
  };
  display: {
    cornerRadius: number;
    strokeWidth: number;
  };
}

export interface ImportOptions {
  nameField?: string;
  descField?: string;
  childrenField?: string;
  parentField?: string;
  idField?: string;
  unwrap?: string;
  stdin?: boolean;
  root?: string[];
  format?: "json" | "csv" | "tsv";
  levelField?: string;
}

export interface FlagMeta {
  type: string;
  default?: string | number | boolean;
  choices?: string[];
  description: string;
}

export interface ExportOptions {
  outDir: string;
  svg: boolean;
  html: boolean;
  png: boolean;
  pdf: boolean;
  scale: number;
  pageSize: string;
  pdfMargin: string;
  dryRun: boolean;
}

export type MeasureTextFn = (text: string) => number;

// ---------------------------------------------------------------------------
// Envelope types
// ---------------------------------------------------------------------------

export interface BcmErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  suggested_action: "retry" | "fix_input" | "escalate";
}

export interface BcmWarning {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface StageMetrics {
  import_ms?: number;
  validate_ms?: number;
  layout_ms?: number;
  render_ms?: number;
  export_ms?: number;
}

export interface Envelope<T> {
  schema_version: string;
  request_id: string;
  ok: boolean;
  command: string;
  result: T | null;
  warnings: BcmWarning[];
  errors: BcmErrorDetail[];
  metrics: {
    duration_ms: number;
    stages: StageMetrics;
  };
}

// ---------------------------------------------------------------------------
// Command result types
// ---------------------------------------------------------------------------

export interface Artefact {
  type: "svg" | "html" | "png" | "pdf";
  path: string;
  bytes: number;
}

export interface RenderResult {
  artefacts: Artefact[];
  model_summary: ModelSummary;
  layout_summary: {
    total_width: number;
    total_height: number;
    leaf_size: Size;
  };
}

export interface InspectResult {
  detected_schema: SchemaType;
  fields: DetectedFields;
  model_summary: ModelSummary;
}

export interface ValidateResult {
  valid: boolean;
  model_summary: ModelSummary;
}
