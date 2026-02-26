import type { ThemeConfig } from "../core/types.js";

export function wrapHtml(
  svg: string,
  width: number,
  height: number,
  theme: ThemeConfig,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=${width}, initial-scale=1.0">
<title>Business Capability Map</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: ${theme.palette.background};
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    padding: 20px;
  }
  svg { max-width: 100%; height: auto; }
  @media print {
    body { padding: 0; }
    svg { max-width: 100%; page-break-inside: avoid; }
  }
</style>
</head>
<body>
${svg}
</body>
</html>`;
}
