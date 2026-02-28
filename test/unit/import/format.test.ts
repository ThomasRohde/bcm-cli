import { detectFormat } from "../../../src/import/format.js";

describe("detectFormat", () => {
  it("returns json for undefined (stdin)", () => {
    expect(detectFormat(undefined)).toBe("json");
  });

  it("detects .csv files", () => {
    expect(detectFormat("model.csv")).toBe("csv");
    expect(detectFormat("/path/to/data.CSV")).toBe("csv");
  });

  it("detects .tsv files", () => {
    expect(detectFormat("model.tsv")).toBe("tsv");
    expect(detectFormat("data.TSV")).toBe("tsv");
  });

  it("detects .tab files as tsv", () => {
    expect(detectFormat("model.tab")).toBe("tsv");
    expect(detectFormat("DATA.TAB")).toBe("tsv");
  });

  it("returns json for .json files", () => {
    expect(detectFormat("model.json")).toBe("json");
  });

  it("returns json for unknown extensions", () => {
    expect(detectFormat("model.xml")).toBe("json");
    expect(detectFormat("model.txt")).toBe("json");
  });
});
