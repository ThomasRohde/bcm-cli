import { parseCsv, coerceValue } from "../../../src/import/csv-parser.js";

describe("coerceValue", () => {
  it("returns empty string as-is", () => {
    expect(coerceValue("")).toBe("");
  });

  it("converts boolean strings", () => {
    expect(coerceValue("true")).toBe(true);
    expect(coerceValue("false")).toBe(false);
    expect(coerceValue("True")).toBe(true);
    expect(coerceValue("FALSE")).toBe(false);
  });

  it("converts numeric strings", () => {
    expect(coerceValue("42")).toBe(42);
    expect(coerceValue("3.14")).toBe(3.14);
    expect(coerceValue("-7")).toBe(-7);
  });

  it("leaves non-numeric strings as strings", () => {
    expect(coerceValue("hello")).toBe("hello");
    expect(coerceValue("123abc")).toBe("123abc");
  });
});

describe("parseCsv", () => {
  it("parses a simple CSV", () => {
    const csv = "name,description\nAlpha,First item\nBeta,Second item\n";
    const rows = parseCsv(csv, "csv");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: "Alpha", description: "First item" });
    expect(rows[1]).toEqual({ name: "Beta", description: "Second item" });
  });

  it("handles quoted fields with commas", () => {
    const csv = 'name,description\n"Order Management","Receive, validate, and track orders"\n';
    const rows = parseCsv(csv, "csv");
    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe("Receive, validate, and track orders");
  });

  it("handles escaped quotes inside quoted fields", () => {
    const csv = 'name,description\nTest,"He said ""hello"""\n';
    const rows = parseCsv(csv, "csv");
    expect(rows[0].description).toBe('He said "hello"');
  });

  it("handles embedded newlines inside quoted fields", () => {
    const csv = 'name,description\nTest,"Line 1\nLine 2"\n';
    const rows = parseCsv(csv, "csv");
    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe("Line 1\nLine 2");
  });

  it("strips UTF-8 BOM", () => {
    const csv = "\uFEFFname,description\nAlpha,First\n";
    const rows = parseCsv(csv, "csv");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveProperty("name", "Alpha");
  });

  it("handles CRLF line endings", () => {
    const csv = "name,description\r\nAlpha,First\r\nBeta,Second\r\n";
    const rows = parseCsv(csv, "csv");
    expect(rows).toHaveLength(2);
  });

  it("skips blank rows", () => {
    const csv = "name,description\nAlpha,First\n\n\nBeta,Second\n";
    const rows = parseCsv(csv, "csv");
    expect(rows).toHaveLength(2);
  });

  it("coerces values by default", () => {
    const csv = "name,count,active\nAlpha,42,true\n";
    const rows = parseCsv(csv, "csv");
    expect(rows[0].count).toBe(42);
    expect(rows[0].active).toBe(true);
  });

  it("throws on empty input", () => {
    expect(() => parseCsv("", "csv")).toThrow("empty");
  });

  it("throws on headers-only input", () => {
    expect(() => parseCsv("name,description\n", "csv")).toThrow("no data rows");
  });

  it("throws on duplicate headers", () => {
    expect(() => parseCsv("name,name\nA,B\n", "csv")).toThrow("Duplicate");
  });

  it("parses TSV format", () => {
    const tsv = "name\tdescription\nAlpha\tFirst item\n";
    const rows = parseCsv(tsv, "tsv");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ name: "Alpha", description: "First item" });
  });

  it("handles missing trailing fields", () => {
    const csv = "name,description,extra\nAlpha,First\n";
    const rows = parseCsv(csv, "csv");
    expect(rows[0].extra).toBe("");
  });
});
