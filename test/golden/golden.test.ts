import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { importJson } from "../../src/import/index.js";
import { layoutTrees } from "../../src/layout/index.js";
import { renderSvg } from "../../src/render/svg-renderer.js";
import { DEFAULT_LAYOUT_OPTIONS, DEFAULT_THEME } from "../../src/core/defaults.js";
import { createStubMeasurer } from "../../src/fonts/metrics.js";

const fixturesDir = join(process.cwd(), "test", "fixtures");
const measureText = createStubMeasurer();

function renderFixture(name: string): string {
  const raw = readFileSync(join(fixturesDir, name), "utf-8");
  const result = importJson(raw);
  const layout = layoutTrees(result.roots, DEFAULT_LAYOUT_OPTIONS, measureText);
  return renderSvg(layout, DEFAULT_THEME);
}

describe("golden snapshot tests", () => {
  it("nested-simple renders consistently", () => {
    const svg = renderFixture("nested-simple.json");
    expect(svg).toMatchSnapshot();
  });

  it("flat-by-id renders consistently", () => {
    const svg = renderFixture("flat-by-id.json");
    expect(svg).toMatchSnapshot();
  });

  it("single-root renders consistently", () => {
    const svg = renderFixture("single-root.json");
    expect(svg).toMatchSnapshot();
  });
});
