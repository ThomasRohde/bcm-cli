function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function attrs(attributes: Record<string, string | number>): string {
  return Object.entries(attributes)
    .map(([k, v]) => `${k}="${typeof v === 'string' ? escapeXml(v) : v}"`)
    .join(" ");
}

export class SvgBuilder {
  private elements: string[] = [];

  rect(attributes: Record<string, string | number>): this {
    this.elements.push(`  <rect ${attrs(attributes)} />`);
    return this;
  }

  text(content: string, attributes: Record<string, string | number>): this {
    this.elements.push(`  <text ${attrs(attributes)}>${escapeXml(content)}</text>`);
    return this;
  }

  openGroup(attributes: Record<string, string | number> = {}): this {
    const a = Object.keys(attributes).length > 0 ? ` ${attrs(attributes)}` : "";
    this.elements.push(`  <g${a}>`);
    return this;
  }

  closeGroup(): this {
    this.elements.push(`  </g>`);
    return this;
  }

  raw(content: string): this {
    this.elements.push(content);
    return this;
  }

  toString(width: number, height: number): string {
    const header = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    return [header, ...this.elements, "</svg>"].join("\n");
  }
}
