import { Command } from "commander";
import { generateRequestId } from "./cli/request-id.js";
import { writeEnvelope, writeStderr, setDiagnosticMode, writeStderrVerbose } from "./cli/output.js";
import { errorEnvelope } from "./cli/envelope.js";
import { BcmAppError } from "./cli/errors.js";
import { runGuide } from "./cli/commands/guide.js";
import { runInspect } from "./cli/commands/inspect.js";
import { runValidate } from "./cli/commands/validate.js";
import { runRender } from "./cli/commands/render.js";
import type { ImportOptions, ExportOptions, LayoutOptions } from "./core/types.js";
import {
  nameFieldOption, descFieldOption, childrenFieldOption, parentFieldOption, idFieldOption,
  unwrapOption, stdinOption, maxDepthOption, sortOption, rootOption,
  gapOption, paddingOption, headerHeightOption, alignmentOption, aspectRatioOption,
  rootGapOption, marginOption, leafHeightOption, minLeafWidthOption, maxLeafWidthOption,
  themeOption, fontOption, fontSizeOption, outDirOption, svgOption, noSvgOption,
  htmlOption, pngOption, pdfOption, scaleOption, pageSizeOption, pdfMarginOption,
  dryRunOption, quietOption, verboseOption, outputOption,
} from "./cli/options.js";

const program = new Command();

program
  .name("bcm")
  .description("Agent-first CLI for rendering Business Capability Maps from JSON")
  .version("0.1.0");

// --- guide ---
program
  .command("guide")
  .description("Return full CLI schema, commands, flags, error codes, and defaults as JSON")
  .action(() => {
    const requestId = generateRequestId();
    const { envelope, exitCode } = runGuide(requestId);
    writeEnvelope(envelope);
    process.exit(exitCode);
  });

// --- shared option helper ---
function addImportOptions(cmd: Command): Command {
  return cmd
    .addOption(nameFieldOption)
    .addOption(descFieldOption)
    .addOption(childrenFieldOption)
    .addOption(parentFieldOption)
    .addOption(idFieldOption)
    .addOption(unwrapOption)
    .addOption(stdinOption)
    .addOption(rootOption);
}

function parseImportOpts(opts: Record<string, unknown>): ImportOptions {
  return {
    nameField: opts.nameField as string | undefined,
    descField: opts.descField as string | undefined,
    childrenField: opts.childrenField as string | undefined,
    parentField: opts.parentField as string | undefined,
    idField: opts.idField as string | undefined,
    unwrap: opts.unwrap as string | undefined,
    stdin: opts.stdin as boolean | undefined,
    root: opts.root as string[] | undefined,
  };
}

// --- inspect ---
const inspectCmd = program
  .command("inspect [input]")
  .description("Detect schema fields and produce a structured summary");
addImportOptions(inspectCmd)
  .addOption(quietOption)
  .addOption(verboseOption)
  .addOption(outputOption)
  .action((input: string | undefined, opts: Record<string, unknown>) => {
    setDiagnosticMode(opts.quiet as boolean, opts.verbose as boolean);
    const requestId = generateRequestId();
    const { envelope, exitCode } = runInspect(input, parseImportOpts(opts), requestId);
    writeEnvelope(envelope);
    process.exit(exitCode);
  });

// --- validate ---
const validateCmd = program
  .command("validate [input]")
  .description("Import + validate; report issues; no artefacts");
addImportOptions(validateCmd)
  .addOption(quietOption)
  .addOption(verboseOption)
  .addOption(outputOption)
  .action((input: string | undefined, opts: Record<string, unknown>) => {
    setDiagnosticMode(opts.quiet as boolean, opts.verbose as boolean);
    const requestId = generateRequestId();
    const { envelope, exitCode } = runValidate(input, parseImportOpts(opts), requestId);
    writeEnvelope(envelope);
    process.exit(exitCode);
  });

// --- render ---
const renderCmd = program
  .command("render [input]")
  .description("Full pipeline: import → layout → render → export");
addImportOptions(renderCmd)
  .addOption(maxDepthOption)
  .addOption(sortOption)
  .addOption(gapOption)
  .addOption(paddingOption)
  .addOption(headerHeightOption)
  .addOption(alignmentOption)
  .addOption(aspectRatioOption)
  .addOption(rootGapOption)
  .addOption(marginOption)
  .addOption(leafHeightOption)
  .addOption(minLeafWidthOption)
  .addOption(maxLeafWidthOption)
  .addOption(themeOption)
  .addOption(fontOption)
  .addOption(fontSizeOption)
  .addOption(outDirOption)
  .addOption(svgOption)
  .addOption(noSvgOption)
  .addOption(htmlOption)
  .addOption(pngOption)
  .addOption(pdfOption)
  .addOption(scaleOption)
  .addOption(pageSizeOption)
  .addOption(pdfMarginOption)
  .addOption(dryRunOption)
  .addOption(quietOption)
  .addOption(verboseOption)
  .addOption(outputOption)
  .action(async (input: string | undefined, opts: Record<string, unknown>) => {
    setDiagnosticMode(opts.quiet as boolean, opts.verbose as boolean);
    const requestId = generateRequestId();
    const importOpts = parseImportOpts(opts);
    const layoutOpts: LayoutOptions = {
      gap: parseInt(opts.gap as string, 10),
      padding: parseInt(opts.padding as string, 10),
      headerHeight: parseInt(opts.headerHeight as string, 10),
      rootGap: parseInt(opts.rootGap as string, 10),
      viewMargin: parseInt(opts.margin as string, 10),
      aspectRatio: parseFloat(opts.aspectRatio as string),
      alignment: opts.alignment as LayoutOptions["alignment"],
      maxDepth: (opts.maxDepth as string) === "all" ? -1 : parseInt(opts.maxDepth as string, 10),
      sortMode: opts.sort as LayoutOptions["sortMode"],
      minLeafWidth: parseInt(opts.minLeafWidth as string, 10),
      maxLeafWidth: parseInt(opts.maxLeafWidth as string, 10),
      leafHeight: parseInt(opts.leafHeight as string, 10),
    };
    const exportOpts: ExportOptions = {
      outDir: opts.outDir as string,
      svg: opts.svg as boolean,
      html: (opts.html ?? false) as boolean,
      png: (opts.png ?? false) as boolean,
      pdf: (opts.pdf ?? false) as boolean,
      scale: parseFloat(opts.scale as string),
      pageSize: opts.pageSize as string,
      pdfMargin: opts.pdfMargin as string,
      dryRun: (opts.dryRun ?? false) as boolean,
    };
    const { envelope, exitCode } = await runRender(
      input,
      importOpts,
      layoutOpts,
      exportOpts,
      opts.theme as string | undefined,
      opts.font as string | undefined,
      opts.fontSize as string | undefined,
      requestId,
    );
    writeEnvelope(envelope);
    process.exit(exitCode);
  });

// Global error handler
process.on("uncaughtException", (err) => {
  const requestId = generateRequestId();
  const envelope = errorEnvelope(
    "bcm.unknown",
    err instanceof BcmAppError ? err : new Error(String(err)),
    { request_id: requestId },
  );
  writeEnvelope(envelope);
  writeStderr(`[${requestId}] Uncaught exception: ${err}`);
  process.exit(90);
});

program.parse();
