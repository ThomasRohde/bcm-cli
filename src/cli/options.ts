import { Option } from "commander";

// Import options
export const nameFieldOption = new Option(
  "--nameField <key>",
  "Override auto-detected name field",
);
export const descFieldOption = new Option(
  "--descField <key>",
  "Override auto-detected description field",
);
export const childrenFieldOption = new Option(
  "--childrenField <key>",
  "Override auto-detected children field",
);
export const parentFieldOption = new Option(
  "--parentField <key>",
  "Override auto-detected parent field",
);
export const idFieldOption = new Option(
  "--idField <key>",
  "Override auto-detected ID field",
);
export const unwrapOption = new Option(
  "--unwrap <property>",
  "Explicit property to unwrap from wrapper object",
);
export const stdinOption = new Option(
  "--stdin",
  "Read input from stdin instead of file",
).default(false);
export const formatOption = new Option(
  "--format <type>",
  "Input format (auto-detected from extension if omitted)",
).choices(["json", "csv", "tsv"]);
export const levelFieldOption = new Option(
  "--levelField <key>",
  "Override auto-detected level/depth field for CSV hierarchy inference",
);

// Model options
export const maxDepthOption = new Option(
  "--maxDepth <n>",
  "Maximum depth to render (-1 or 'all' for unlimited)",
).default("-1");
export const sortOption = new Option(
  "--sort <mode>",
  "Sort mode: subtrees or alphabetical",
)
  .choices(["subtrees", "alphabetical"])
  .default("subtrees");
export const rootOption = new Option(
  "--root <idOrName>",
  "Select specific root by ID or name (repeatable)",
).argParser((value: string, previous: string[] | undefined) => {
  const list = previous ?? [];
  list.push(value);
  return list;
});

// Layout options
export const gapOption = new Option("--gap <px>", "Element gap in px").default(
  "8",
);
export const paddingOption = new Option(
  "--padding <px>",
  "Container padding in px",
).default("12");
export const headerHeightOption = new Option(
  "--headerHeight <px>",
  "Header height in px",
).default("40");
export const alignmentOption = new Option(
  "--alignment <mode>",
  "Row alignment: left, center, or right",
)
  .choices(["left", "center", "right"])
  .default("center");
export const aspectRatioOption = new Option(
  "--aspectRatio <float>",
  "Target aspect ratio",
).default("1.6");
export const rootGapOption = new Option(
  "--rootGap <px>",
  "Gap between root trees",
).default("30");
export const marginOption = new Option(
  "--margin <px>",
  "View margin in px",
).default("20");

// Leaf sizing
export const leafHeightOption = new Option(
  "--leafHeight <px>",
  "Leaf node height",
).default("45");
export const minLeafWidthOption = new Option(
  "--minLeafWidth <px>",
  "Minimum leaf width",
).default("120");
export const maxLeafWidthOption = new Option(
  "--maxLeafWidth <px>",
  "Maximum leaf width",
).default("200");

// Theme/style
export const themeOption = new Option("--theme <file>", "Theme JSON file path");
export const fontOption = new Option("--font <name>", "Font name").default(
  "Segoe UI",
);
export const fontSizeOption = new Option(
  "--fontSize <pt>",
  "Font size in pt",
).default("9");

// Output options
export const outDirOption = new Option(
  "--outDir <path>",
  "Output directory",
).default(".");
export const svgOption = new Option("--svg", "Output SVG file").default(true);
export const noSvgOption = new Option("--no-svg", "Skip SVG output");
export const htmlOption = new Option("--html", "Output HTML file").default(
  false,
);
export const pngOption = new Option("--png", "Output PNG file").default(false);
export const pdfOption = new Option("--pdf", "Output PDF file").default(false);
export const scaleOption = new Option(
  "--scale <float>",
  "PNG pixel density scale",
).default("2");
export const pageSizeOption = new Option(
  "--pageSize <size>",
  "PDF page size (A4, Letter, WxH)",
).default("A4");
export const pdfMarginOption = new Option(
  "--pdfMargin <value>",
  "PDF margins (CSS-like value, e.g. 10mm)",
).default("10mm");
export const dryRunOption = new Option(
  "--dry-run",
  "Compute layout and report summary without writing files",
).default(false);

// Diagnostic options
export const quietOption = new Option(
  "--quiet",
  "Envelope only on stdout; errors only on stderr",
).default(false);
export const verboseOption = new Option(
  "--verbose",
  "Extra diagnostics in result and full debug on stderr",
).default(false);
export const outputOption = new Option(
  "--output <format>",
  "Force output format",
)
  .choices(["json"])
  .default("json");
