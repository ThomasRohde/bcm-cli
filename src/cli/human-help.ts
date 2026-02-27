import type { Command, Option } from "commander";
import { Help } from "commander";

const INPUT_OPTIONS = new Set([
  "nameField",
  "descField",
  "childrenField",
  "parentField",
  "idField",
  "unwrap",
  "stdin",
  "root",
]);

const MODEL_OPTIONS = new Set([
  "maxDepth",
  "sort",
]);

const LAYOUT_OPTIONS = new Set([
  "gap",
  "padding",
  "headerHeight",
  "alignment",
  "aspectRatio",
  "rootGap",
  "margin",
  "leafHeight",
  "minLeafWidth",
  "maxLeafWidth",
]);

const THEME_OPTIONS = new Set([
  "theme",
  "font",
  "fontSize",
]);

const OUTPUT_OPTIONS = new Set([
  "outDir",
  "svg",
  "html",
  "png",
  "pdf",
  "scale",
  "pageSize",
  "pdfMargin",
  "dryRun",
]);

const DIAGNOSTIC_OPTIONS = new Set([
  "quiet",
  "verbose",
  "output",
]);

interface OptionGroup {
  title: string;
  options: Option[];
}

function canUseColor(): boolean {
  return process.stdout.isTTY && process.env.NO_COLOR !== "1";
}

function commandPath(command: Command): string {
  const segments: string[] = [];
  let current: Command | null = command;
  while (current) {
    segments.push(current.name());
    current = current.parent;
  }
  return segments.reverse().join(" ").trim();
}

function formatDefaultValue(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return String(value);
}

function optionMeta(option: Option): string[] {
  const meta: string[] = [];
  if (option.argChoices && option.argChoices.length > 0) {
    meta.push(`choices: ${option.argChoices.join(", ")}`);
  }
  if (option.defaultValue !== undefined) {
    meta.push(`default: ${formatDefaultValue(option.defaultValue)}`);
  }
  if (option.mandatory) meta.push("required");
  return meta;
}

function groupForOption(path: string, option: Option): string {
  const key = option.attributeName();
  if (key === "help" || key === "version") return "General";

  if (path === "bcm render") {
    if (INPUT_OPTIONS.has(key)) return "Input";
    if (MODEL_OPTIONS.has(key)) return "Model";
    if (LAYOUT_OPTIONS.has(key)) return "Layout";
    if (THEME_OPTIONS.has(key)) return "Theme";
    if (OUTPUT_OPTIONS.has(key)) return "Output";
    if (DIAGNOSTIC_OPTIONS.has(key)) return "Diagnostics";
    return "Other";
  }

  if (path === "bcm inspect" || path === "bcm validate") {
    if (INPUT_OPTIONS.has(key)) return "Input";
    if (DIAGNOSTIC_OPTIONS.has(key)) return "Diagnostics";
    return "General";
  }

  return "General";
}

function orderedGroupNames(path: string): string[] {
  if (path === "bcm render") {
    return ["Input", "Model", "Layout", "Theme", "Output", "Diagnostics", "General", "Other"];
  }
  if (path === "bcm inspect" || path === "bcm validate") {
    return ["Input", "Diagnostics", "General", "Other"];
  }
  return ["General", "Other"];
}

function groupOptions(path: string, options: readonly Option[]): OptionGroup[] {
  const buckets = new Map<string, Option[]>();
  for (const option of options) {
    const group = groupForOption(path, option);
    const list = buckets.get(group) ?? [];
    list.push(option);
    buckets.set(group, list);
  }

  const ordered = orderedGroupNames(path);
  const groups: OptionGroup[] = [];
  for (const name of ordered) {
    const list = buckets.get(name);
    if (list && list.length > 0) groups.push({ title: name, options: list });
  }
  for (const [name, list] of buckets) {
    if (ordered.includes(name)) continue;
    if (list.length > 0) groups.push({ title: name, options: list });
  }
  return groups;
}

function examplesFor(path: string): string[] {
  switch (path) {
    case "bcm":
      return [
        "bcm render model.json --outDir out --svg",
        "bcm validate model.json",
        "bcm inspect model.json --root \"Customer Management\"",
      ];
    case "bcm render":
      return [
        "bcm render model.json --outDir out --svg --html",
        "bcm render model.json --root \"Customer Management\" --png --pdf",
        "cat model.json | bcm render --stdin --outDir out --dry-run",
      ];
    case "bcm validate":
      return [
        "bcm validate model.json",
        "bcm validate model.json --nameField title --childrenField subCapabilities",
      ];
    case "bcm inspect":
      return [
        "bcm inspect model.json",
        "bcm inspect model.json --root \"Product Management\"",
      ];
    default:
      return [];
  }
}

class HumanHelp extends Help {
  private useColor = false;

  override prepareContext(contextOptions: {
    error?: boolean;
    helpWidth?: number;
    outputHasColors?: boolean;
  }): void {
    super.prepareContext(contextOptions);
    this.useColor = contextOptions.outputHasColors ?? canUseColor();
    this.minWidthToWrap = 42;
    if (!this.helpWidth || this.helpWidth < 88) this.helpWidth = 100;
  }

  private paint(code: string, text: string): string {
    if (!this.useColor) return text;
    return `\x1b[${code}m${text}\x1b[0m`;
  }

  private title(text: string): string {
    return this.paint("1;36", text);
  }

  private dim(text: string): string {
    return this.paint("2", text);
  }

  private accent(text: string): string {
    return this.paint("1;32", text);
  }

  private optionTermText(text: string): string {
    return this.paint("1;33", text);
  }

  override formatHelp(cmd: Command, helper: Help): string {
    const lines: string[] = [];
    const path = commandPath(cmd);
    const heading = path === "bcm" ? "Business Capability Map CLI" : `${path} command`;

    lines.push(this.title(heading));
    const description = helper.commandDescription(cmd);
    if (description) lines.push(this.dim(description));

    lines.push("");
    lines.push(this.title("Usage"));
    lines.push(`  ${this.accent(helper.commandUsage(cmd))}`);

    const args = helper.visibleArguments(cmd);
    if (args.length > 0) {
      lines.push("");
      lines.push(this.title("Arguments"));
      const width = helper.longestArgumentTermLength(cmd, helper);
      for (const arg of args) {
        lines.push(helper.formatItem(
          this.optionTermText(helper.argumentTerm(arg)),
          width,
          helper.argumentDescription(arg),
          helper,
        ));
      }
    }

    const commands = helper.visibleCommands(cmd);
    if (commands.length > 0) {
      lines.push("");
      lines.push(this.title("Commands"));
      const width = helper.longestSubcommandTermLength(cmd, helper);
      for (const subcommand of commands) {
        lines.push(helper.formatItem(
          this.optionTermText(helper.subcommandTerm(subcommand)),
          width,
          helper.subcommandDescription(subcommand),
          helper,
        ));
      }
    }

    const options = helper.visibleOptions(cmd);
    if (options.length > 0) {
      const groups = groupOptions(path, options);
      for (const group of groups) {
        lines.push("");
        lines.push(this.title(`${group.title} Options`));
        const width = Math.max(
          1,
          ...group.options.map((option) => helper.displayWidth(helper.optionTerm(option))),
        );
        for (const option of group.options) {
          const meta = optionMeta(option);
          const descriptionText = helper.optionDescription(option);
          const detail = meta.length > 0 ? `${descriptionText} (${meta.join("; ")})` : descriptionText;
          lines.push(helper.formatItem(
            this.optionTermText(helper.optionTerm(option)),
            width,
            detail,
            helper,
          ));
        }
      }
    }

    const examples = examplesFor(path);
    if (examples.length > 0) {
      lines.push("");
      lines.push(this.title("Examples"));
      for (const example of examples) {
        lines.push(`  ${this.accent("$")} ${example}`);
      }
    }

    if (path === "bcm") {
      lines.push("");
      lines.push(this.title("Schemas"));
      lines.push("  nested: array of objects with a children field");
      lines.push("  flat:   array with parent references");
      lines.push("  simple: flat list of names");
      lines.push("");
      lines.push(this.dim('Tip: run "bcm guide" for full machine-readable command metadata.'));
    }

    return lines.join("\n");
  }
}

function applyHumanHelpToCommand(command: Command): void {
  command.createHelp = () => new HumanHelp();
  for (const subcommand of command.commands) {
    applyHumanHelpToCommand(subcommand as Command);
  }
}

export function applyHumanHelp(program: Command): void {
  applyHumanHelpToCommand(program);
}
