import { describe, it, expect } from "vitest";
import { Command } from "commander";
import { applyHumanHelp } from "../../../src/cli/human-help.js";
import {
  nameFieldOption,
  gapOption,
  outDirOption,
  quietOption,
  sortOption,
  outputOption,
} from "../../../src/cli/options.js";

describe("human help formatter", () => {
  it("formats root help with clear sections", () => {
    const program = new Command();
    program
      .name("bcm")
      .description("Agent-first CLI for rendering Business Capability Maps from JSON")
      .version("1.0.0");
    program.command("render [input]").description("Render output artefacts");
    program.command("validate [input]").description("Validate input model");

    applyHumanHelp(program);

    const help = program.helpInformation();
    expect(help).toContain("Business Capability Map CLI");
    expect(help).toContain("Usage");
    expect(help).toContain("Commands");
    expect(help).toContain("Examples");
    expect(help).toContain("Schemas");
  });

  it("groups render options and shows metadata", () => {
    const program = new Command();
    program.name("bcm");
    const render = program.command("render [input]").description("Render output artefacts");
    render
      .addOption(nameFieldOption)
      .addOption(sortOption)
      .addOption(gapOption)
      .addOption(outDirOption)
      .addOption(quietOption)
      .addOption(outputOption);

    applyHumanHelp(program);

    const help = render.helpInformation();
    expect(help).toContain("Input Options");
    expect(help).toContain("Model Options");
    expect(help).toContain("Layout Options");
    expect(help).toContain("Output Options");
    expect(help).toContain("Diagnostics Options");
    expect(help).toContain("default: \"8\"");
    expect(help).toContain("choices: subtrees, alphabetical");
  });
});
